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
      statusMessage: "请通过 input、videoId 或 url 传入 YouTube 视频信息。",
    });
  }

  const videoId = extractVideoId(rawInput);

  if (!videoId) {
    throw createError({
      statusCode: 400,
      statusMessage: "请输入有效的 YouTube VideoId 或 URL。",
    });
  }

  const lang = first(query.lang) || undefined;

  try {
    return await fetchTranscript(videoId, {
      ...(lang ? { lang } : {}),
      cache,
    });
  } catch (e) {
    throw toHttpError(e);
  }
});

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

function toHttpError(e: unknown) {
  if (e instanceof YoutubeTranscriptInvalidVideoIdError) {
    return createError({ statusCode: 400, statusMessage: "无效的 YouTube VideoId 或 URL。" });
  }

  if (e instanceof YoutubeTranscriptVideoUnavailableError) {
    return createError({
      statusCode: 404,
      statusMessage: "视频不可用，可能已被删除或限制访问。",
      data: { videoId: e.videoId },
    });
  }

  if (e instanceof YoutubeTranscriptDisabledError) {
    return createError({
      statusCode: 403,
      statusMessage: "该视频关闭了字幕功能。",
      data: { videoId: e.videoId },
    });
  }

  if (e instanceof YoutubeTranscriptNotAvailableError) {
    return createError({
      statusCode: 404,
      statusMessage: "该视频没有可用字幕。",
      data: { videoId: e.videoId },
    });
  }

  if (e instanceof YoutubeTranscriptNotAvailableLanguageError) {
    return createError({
      statusCode: 404,
      statusMessage: "请求的字幕语言不可用。",
      data: { videoId: e.videoId, lang: e.lang, availableLangs: e.availableLangs },
    });
  }

  if (e instanceof YoutubeTranscriptTooManyRequestError) {
    return createError({
      statusCode: 429,
      statusMessage: "请求过于频繁，YouTube 暂时限制了当前 IP。",
    });
  }

  return createError({
    statusCode: 500,
    statusMessage: e instanceof Error ? e.message : "获取字幕失败。",
  });
}

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0]?.trim() ?? "";
  return typeof value === "string" ? value.trim() : "";
}

function parseVideoId(value: string | null | undefined): string | null {
  if (!value) return null;
  const id = value.trim();
  return VIDEO_ID_PATTERN.test(id) ? id : null;
}
