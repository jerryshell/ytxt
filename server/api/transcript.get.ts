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

const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;
const cache = new InMemoryCache(1000 * 60 * 10);

type Query = {
  input?: string | string[];
  videoId?: string | string[];
  url?: string | string[];
  lang?: string | string[];
};

export default defineEventHandler(async (event) => {
  const query = getQuery(event) as Query;
  const rawInput = first(query.input) || first(query.videoId) || first(query.url);

  if (!rawInput) {
    throw createError({
      statusCode: 400,
      statusMessage: "Please provide YouTube video info via input, videoId, or url.",
    });
  }

  const videoId = extractVideoId(rawInput);

  if (!videoId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Please enter a valid YouTube VideoId or URL.",
    });
  }

  const lang = first(query.lang) || undefined;

  try {
    return await fetchTranscript(videoId, {
      ...(lang ? { lang } : {}),
      cache,
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

function extractVideoId(input: string): string | null {
  const trimmed = input.trim();

  if (VIDEO_ID_PATTERN.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");

    if (host === "youtu.be") {
      return parseVideoId(url.pathname.split("/").filter(Boolean)[0]);
    }

    if (host === "youtube.com" || host.endsWith(".youtube.com")) {
      const vParam = parseVideoId(url.searchParams.get("v"));
      if (vParam) return vParam;

      const parts = url.pathname.split("/").filter(Boolean);
      const type = parts[0];
      const id = parts[1];
      if (type && id && ["embed", "live", "shorts", "v"].includes(type)) {
        return parseVideoId(id);
      }
    }
  } catch {}

  return null;
}

function parseVideoId(value: string | null | undefined): string | null {
  if (!value) return null;
  const id = value.trim();
  return VIDEO_ID_PATTERN.test(id) ? id : null;
}

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0]?.trim() ?? "";
  return typeof value === "string" ? value.trim() : "";
}
