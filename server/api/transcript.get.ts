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
const transcriptCache = new InMemoryCache(1000 * 60 * 10);

type TranscriptQuery = {
  input?: string | string[];
  videoId?: string | string[];
  url?: string | string[];
  lang?: string | string[];
};

function readQueryValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0]?.trim() ?? "";
  }

  return typeof value === "string" ? value.trim() : "";
}

function readVideoIdCandidate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const candidate = value.trim();
  return VIDEO_ID_PATTERN.test(candidate) ? candidate : null;
}

function extractVideoId(input: string) {
  if (VIDEO_ID_PATTERN.test(input)) {
    return input;
  }

  try {
    const url = new URL(input);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");

    if (hostname === "youtu.be") {
      const [shortId] = url.pathname.split("/").filter(Boolean);
      return readVideoIdCandidate(shortId);
    }

    if (hostname === "youtube.com" || hostname.endsWith(".youtube.com")) {
      const queryVideoId = readVideoIdCandidate(url.searchParams.get("v"));

      if (queryVideoId) {
        return queryVideoId;
      }

      const [pathType, pathVideoId] = url.pathname.split("/").filter(Boolean);

      if (pathType && pathVideoId && ["embed", "live", "shorts", "v"].includes(pathType)) {
        return readVideoIdCandidate(pathVideoId);
      }
    }
  } catch {
    return null;
  }

  return null;
}

function toHttpError(error: unknown) {
  if (error instanceof YoutubeTranscriptInvalidVideoIdError) {
    return createError({
      statusCode: 400,
      statusMessage: "无效的 YouTube VideoId 或 URL。",
    });
  }

  if (error instanceof YoutubeTranscriptVideoUnavailableError) {
    return createError({
      statusCode: 404,
      statusMessage: "视频不可用，可能已被删除或限制访问。",
      data: {
        videoId: error.videoId,
      },
    });
  }

  if (error instanceof YoutubeTranscriptDisabledError) {
    return createError({
      statusCode: 403,
      statusMessage: "该视频关闭了字幕功能。",
      data: {
        videoId: error.videoId,
      },
    });
  }

  if (error instanceof YoutubeTranscriptNotAvailableError) {
    return createError({
      statusCode: 404,
      statusMessage: "该视频没有可用字幕。",
      data: {
        videoId: error.videoId,
      },
    });
  }

  if (error instanceof YoutubeTranscriptNotAvailableLanguageError) {
    return createError({
      statusCode: 404,
      statusMessage: "请求的字幕语言不可用。",
      data: {
        videoId: error.videoId,
        lang: error.lang,
        availableLangs: error.availableLangs,
      },
    });
  }

  if (error instanceof YoutubeTranscriptTooManyRequestError) {
    return createError({
      statusCode: 429,
      statusMessage: "请求过于频繁，YouTube 暂时限制了当前 IP。",
    });
  }

  return createError({
    statusCode: 500,
    statusMessage: error instanceof Error ? error.message : "获取字幕失败。",
  });
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event) as TranscriptQuery;
  const input =
    readQueryValue(query.input) || readQueryValue(query.videoId) || readQueryValue(query.url);

  if (!input) {
    throw createError({
      statusCode: 400,
      statusMessage: "请通过 input、videoId 或 url 传入 YouTube 视频信息。",
    });
  }

  const videoId = extractVideoId(input);

  if (!videoId) {
    throw createError({
      statusCode: 400,
      statusMessage: "请输入有效的 YouTube VideoId 或 URL。",
    });
  }

  const lang = readQueryValue(query.lang) || undefined;

  try {
    const transcript = await fetchTranscript(videoId, {
      ...(lang ? { lang } : {}),
      cache: transcriptCache,
    });

    return transcript;
  } catch (error) {
    throw toHttpError(error);
  }
});
