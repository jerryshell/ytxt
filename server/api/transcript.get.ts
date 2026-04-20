import {
  InMemoryCache,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptInvalidVideoIdError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptNotAvailableLanguageError,
  YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptVideoUnavailableError,
  fetchTranscript,
} from "youtube-transcript-plus";

const CACHE_TTL_MS = 1000 * 60 * 10;
const cache = new InMemoryCache(CACHE_TTL_MS);

type Query = {
  input?: string | string[];
  videoId?: string | string[];
  url?: string | string[];
  lang?: string | string[];
};

export default defineEventHandler(async (event) => {
  const query = getQuery(event) as Query;
  const input =
    readQueryValue(query.input) ?? readQueryValue(query.videoId) ?? readQueryValue(query.url);

  if (!input) {
    throw createError({
      statusCode: 400,
      statusMessage: "Please provide YouTube video info via input, videoId, or url.",
    });
  }

  const lang = readQueryValue(query.lang);

  try {
    return await fetchTranscript(input, {
      ...(lang ? { lang } : {}),
      cache,
      retries: 2,
    });
  } catch (error) {
    throw toHttpError(error);
  }
});

function toHttpError(error: unknown) {
  if (error instanceof YoutubeTranscriptInvalidVideoIdError) {
    return createError({ statusCode: 400, statusMessage: "Invalid YouTube VideoId or URL." });
  }

  if (error instanceof YoutubeTranscriptVideoUnavailableError) {
    return createError({
      statusCode: 404,
      statusMessage: "Video unavailable, may have been deleted or access restricted.",
      data: { videoId: error.videoId },
    });
  }

  if (error instanceof YoutubeTranscriptDisabledError) {
    return createError({
      statusCode: 403,
      statusMessage: "Transcripts are disabled for this video.",
      data: { videoId: error.videoId },
    });
  }

  if (error instanceof YoutubeTranscriptNotAvailableError) {
    return createError({
      statusCode: 404,
      statusMessage: "No transcripts available for this video.",
      data: { videoId: error.videoId },
    });
  }

  if (error instanceof YoutubeTranscriptNotAvailableLanguageError) {
    return createError({
      statusCode: 404,
      statusMessage: "Requested transcript language is not available.",
      data: { videoId: error.videoId, lang: error.lang, availableLangs: error.availableLangs },
    });
  }

  if (error instanceof YoutubeTranscriptTooManyRequestError) {
    return createError({
      statusCode: 429,
      statusMessage: "Too many requests, YouTube has temporarily blocked the current IP.",
    });
  }

  return createError({
    statusCode: 500,
    statusMessage: error instanceof Error ? error.message : "Failed to fetch transcript.",
  });
}

function readQueryValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    value = value[0];
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
}
