<script setup lang="ts">
const TEST_VIDEO_URL = "UF8uR6Z6KLc";
const HISTORY_KEY = "ytxt_history";
const MAX_HISTORY = 10;

const { locale, locales, setLocale, t } = useI18n();
const toast = useToast();

type Segment = { text: string; duration: number; offset: number; lang: string };
type ApiError = {
  statusMessage?: string;
  message?: string;
  data?: { statusMessage?: string; message?: string; availableLangs?: string[] };
};

type HistoryItem = {
  input: string;
  lang: string;
  title?: string;
  timestamp: number;
};

useSeoMeta({ title: t("title"), description: t("description") });

const input = ref("");
const lang = ref("en");
const pending = ref(false);
const error = ref("");
const availableLangs = ref<string[]>([]);
const transcript = ref<Segment[] | null>(null);
const history = ref<HistoryItem[]>([]);

const segments = computed(() => transcript.value ?? []);
const hasResult = computed(() => segments.value.length > 0);

const apiInput = computed(() => input.value.trim() || TEST_VIDEO_URL);
const apiLang = computed(() => (lang.value === "auto" ? "auto" : lang.value));

const plainText = computed(() =>
  segments.value
    .map((s) => s.text.trim())
    .filter(Boolean)
    .join("\n"),
);

const totalDuration = computed(() => {
  const last = segments.value.at(-1);
  return last ? Number((last.offset + last.duration).toFixed(2)) : 0;
});

const durationLabel = computed(() => (hasResult.value ? formatTime(totalDuration.value) : "--:--"));

const statusLabel = computed(() => {
  if (pending.value) return t("status.pending");
  if (hasResult.value) return t("status.success");
  return t("status.idle");
});

const langOptions = [
  { label: "Auto", value: "auto" },
  { label: "中文 (简体)", value: "zh-CN" },
  { label: "中文 (繁體)", value: "zh-TW" },
  { label: "English", value: "en" },
  { label: "日本語", value: "ja" },
  { label: "한국어", value: "ko" },
  { label: "Deutsch", value: "de" },
  { label: "Español", value: "es" },
  { label: "Français", value: "fr" },
  { label: "Italiano", value: "it" },
  { label: "Português", value: "pt" },
  { label: "Русский", value: "ru" },
  { label: "العربية", value: "ar" },
  { label: "हिन्दी", value: "hi" },
  { label: "Bahasa Indonesia", value: "id" },
  { label: "Türkçe", value: "tr" },
  { label: "Tiếng Việt", value: "vi" },
  { label: "Nederlands", value: "nl" },
  { label: "Polski", value: "pl" },
  { label: "Svenska", value: "sv" },
  { label: "ไทย", value: "th" },
];

const apiQuery = computed(() => {
  const params = new URLSearchParams({ input: apiInput.value });
  if (lang.value && lang.value !== "auto") params.set("lang", lang.value);
  return params.toString();
});

const curlCommand = computed(
  () => `curl "${window.location.origin}/api/transcript?${apiQuery.value}"`,
);

function loadHistory() {
  if (import.meta.client) {
    const saved = localStorage.getItem(HISTORY_KEY);
    if (saved) {
      try {
        history.value = JSON.parse(saved);
      } catch {
        history.value = [];
      }
    }
  }
}

function saveHistory() {
  if (import.meta.client) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value));
  }
}

function addToHistory(item: Omit<HistoryItem, "timestamp">) {
  const existsIndex = history.value.findIndex(
    (h) => h.input === item.input && h.lang === item.lang,
  );
  if (existsIndex !== -1) {
    history.value.splice(existsIndex, 1);
  }
  history.value.unshift({ ...item, timestamp: Date.now() });
  if (history.value.length > MAX_HISTORY) {
    history.value = history.value.slice(0, MAX_HISTORY);
  }
  saveHistory();
}

function removeFromHistory(index: number) {
  history.value.splice(index, 1);
  saveHistory();
}

function clearHistory() {
  history.value = [];
  saveHistory();
}

function loadHistoryItem(item: HistoryItem) {
  input.value = item.input;
  lang.value = item.lang;
  fetchTranscript();
}

function formatHistoryTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

onMounted(() => {
  loadHistory();
});

async function fetchTranscript() {
  const inputValue = input.value.trim();
  const langValue = lang.value === "auto" ? "" : lang.value;

  if (!inputValue) {
    error.value = t("error.emptyInput");
    transcript.value = null;
    availableLangs.value = [];
    return;
  }

  pending.value = true;
  error.value = "";
  availableLangs.value = [];

  try {
    transcript.value = await $fetch<Segment[]>("/api/transcript", {
      query: { input: inputValue, ...(langValue ? { lang: langValue } : {}) },
    });
    addToHistory({ input: inputValue, lang: langValue || "auto" });
  } catch (e) {
    transcript.value = null;
    error.value = extractError(e);
  } finally {
    pending.value = false;
  }
}

function useTestVideo() {
  input.value = TEST_VIDEO_URL;
  lang.value = "en";
  fetchTranscript();
}

function copyText(text: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.add({ title: t("toast.copied"), color: "success", icon: "i-lucide-check" }),
    () => toast.add({ title: t("toast.copyFailed"), color: "error", icon: "i-lucide-x" }),
  );
}

function copyTranscript() {
  copyText(plainText.value);
}

function copyTimeline() {
  const timeline = segments.value
    .map((s) => `${formatTime(s.offset)} ${s.text.trim()}`)
    .filter(Boolean)
    .join("\n");
  copyText(timeline);
}

function formatSrtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return (
    [h, m, s].map((n) => String(n).padStart(2, "0")).join(":") + "," + String(ms).padStart(3, "0")
  );
}

function generateSrt(): string {
  return segments.value
    .map((s, i) => {
      const start = formatSrtTime(s.offset);
      const end = formatSrtTime(s.offset + s.duration);
      return `${i + 1}\n${start} --> ${end}\n${s.text.trim()}\n`;
    })
    .join("\n");
}

function downloadSrt() {
  const srtContent = generateSrt();
  const blob = new Blob([srtContent], { type: "text/srt;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${apiInput.value}.srt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.add({ title: t("toast.srtDownloaded"), color: "success", icon: "i-lucide-check" });
}

function copyCurl() {
  copyText(curlCommand.value);
}

function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  return h > 0
    ? [h, m, s].map((n) => String(n).padStart(2, "0")).join(":")
    : [m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

function extractError(e: unknown): string {
  const err = e as ApiError | null;
  availableLangs.value = err?.data?.availableLangs ?? [];
  return (
    err?.data?.statusMessage ||
    err?.data?.message ||
    err?.statusMessage ||
    err?.message ||
    t("error.fetchFailed")
  );
}
</script>

<template>
  <main class="min-h-screen bg-default text-default">
    <UContainer class="flex min-h-screen flex-col px-4 py-8 sm:py-12">
      <header class="flex justify-end gap-3 pb-6">
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-lucide-github"
          href="https://github.com/jerryshell/ytxt"
          target="_blank"
        />
        <div class="flex gap-2">
          <UButton
            v-for="l in locales"
            :key="l.code"
            :color="l.code === locale ? 'primary' : 'neutral'"
            size="sm"
            variant="ghost"
            @click="setLocale(l.code)"
          >
            {{ l.name }}
          </UButton>
        </div>
        <UColorModeButton color="neutral" variant="ghost" />
      </header>

      <section
        class="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 pb-12 text-center"
      >
        <div class="space-y-4">
          <h1 class="text-5xl font-medium tracking-tight sm:text-6xl">
            <span class="text-[#4285F4]">Y</span>
            <span class="text-[#EA4335]">T</span>
            <span class="text-[#FBBC05]">X</span>
            <span class="text-[#34A853]">T</span>
          </h1>

          <p class="mx-auto max-w-2xl text-sm leading-6 text-muted sm:text-base">
            {{ t("description") }}
          </p>
        </div>

        <form class="w-full space-y-4" @submit.prevent="fetchTranscript">
          <UInput
            v-model="input"
            color="neutral"
            icon="i-lucide-search"
            :placeholder="t('placeholder.source')"
            size="xl"
            variant="outline"
            class="w-full"
            :ui="{ base: 'h-14 rounded-full px-6 text-base shadow-sm' }"
          />

          <div class="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <USelect
              v-model="lang"
              :items="langOptions"
              color="neutral"
              icon="i-lucide-languages"
              :placeholder="t('placeholder.lang')"
              size="lg"
              variant="soft"
              class="w-full sm:w-40"
            />

            <div class="flex flex-wrap justify-center gap-3">
              <UButton
                type="submit"
                size="lg"
                :loading="pending"
                trailing-icon="i-lucide-arrow-right"
              >
                {{ t("button.extract") }}
              </UButton>

              <UButton
                color="neutral"
                size="lg"
                variant="soft"
                trailing-icon="i-lucide-flask-conical"
                @click.prevent="useTestVideo"
              >
                {{ t("button.useTestVideo") }}
              </UButton>

              <UButton
                color="neutral"
                size="lg"
                variant="ghost"
                :href="`/api/transcript?${apiQuery}`"
                target="_blank"
              >
                {{ t("button.viewApi") }}
              </UButton>
            </div>
          </div>

          <UAlert
            v-if="error"
            color="error"
            variant="soft"
            :title="t('alert.fetchFailed')"
            :description="error"
          />

          <UAlert
            v-if="availableLangs.length"
            color="warning"
            variant="soft"
            :title="t('alert.availableLangs')"
            :description="availableLangs.join(', ')"
          />
        </form>

        <div v-if="history.length" class="w-full max-w-2xl">
          <div class="flex items-center justify-between px-1">
            <span class="text-sm text-muted">{{ t("history.title") }}</span>
            <UButton color="neutral" variant="ghost" size="xs" @click="clearHistory">
              {{ t("history.clear") }}
            </UButton>
          </div>
          <div class="mt-2 space-y-2">
            <div
              v-for="(item, index) in history"
              :key="item.timestamp"
              class="flex items-center gap-3 rounded-xl bg-default/50 px-4 py-3 ring ring-default transition-colors hover:bg-default"
            >
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                class="flex-1 justify-start truncate"
                @click="loadHistoryItem(item)"
              >
                <span class="truncate">{{ item.input }}</span>
                <UBadge
                  v-if="item.lang && item.lang !== 'auto'"
                  color="neutral"
                  variant="soft"
                  size="xs"
                  class="ml-2 shrink-0"
                >
                  {{ item.lang }}
                </UBadge>
              </UButton>
              <span class="shrink-0 text-xs text-dimmed">
                {{ formatHistoryTime(item.timestamp) }}
              </span>
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                icon="i-lucide-x"
                @click="removeFromHistory(index)"
              />
            </div>
          </div>
        </div>
      </section>

      <section v-if="hasResult" class="mx-auto w-full max-w-5xl space-y-4 pb-8">
        <div class="flex flex-wrap gap-2">
          <UBadge color="neutral" variant="soft">{{ t("label.status") }} {{ statusLabel }}</UBadge>
          <UBadge color="neutral" variant="soft"
            >{{ segments.length }} {{ t("label.segments") }}</UBadge
          >
          <UBadge color="neutral" variant="soft">{{ durationLabel }}</UBadge>
          <UBadge color="neutral" variant="soft">{{ segments[0]?.lang ?? apiLang }}</UBadge>
        </div>

        <div class="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <UCard
            variant="subtle"
            class="lg:h-full"
            :ui="{ root: 'flex h-full flex-col', body: 'flex flex-1 flex-col p-4 sm:p-6' }"
          >
            <template #header>
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 space-y-1">
                  <h2 class="text-base font-semibold text-highlighted">
                    {{ t("card.transcriptFull") }}
                  </h2>
                  <p class="truncate text-sm text-muted">{{ input }}</p>
                </div>

                <div class="flex items-center gap-2">
                  <UBadge color="neutral" variant="soft" class="shrink-0">
                    {{ t("label.plainText") }}
                  </UBadge>

                  <UButton
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    icon="i-lucide-copy"
                    @click="copyTranscript"
                  />
                </div>
              </div>
            </template>

            <div class="flex flex-1 flex-col gap-3">
              <p class="text-xs leading-5 text-muted">{{ t("hint") }}</p>

              <UTextarea
                :model-value="plainText"
                color="neutral"
                readonly
                :rows="18"
                size="lg"
                variant="none"
                class="w-full flex-1"
                :ui="{
                  root: 'relative flex w-full flex-1 items-stretch',
                  base: 'h-full min-h-[24rem] resize-none overflow-y-auto rounded-2xl bg-default/80 px-4 py-4 font-mono text-sm leading-7 text-toned ring ring-default sm:min-h-[30rem]',
                }"
              />
            </div>
          </UCard>

          <div class="space-y-4">
            <UCard variant="subtle">
              <template #header>
                <div class="flex items-center justify-between gap-3">
                  <h2 class="text-base font-semibold text-highlighted">{{ t("card.apiCall") }}</h2>

                  <UButton
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    icon="i-lucide-terminal"
                    :label="t('button.copyAsCurl')"
                    @click="copyCurl"
                  />
                </div>
              </template>

              <div class="space-y-3 text-sm text-toned">
                <div class="rounded-xl bg-default px-4 py-3 ring ring-default">
                  <p class="font-mono text-default">GET /api/transcript</p>
                </div>

                <div class="rounded-xl bg-default px-4 py-3 ring ring-default">
                  <p class="text-xs uppercase tracking-wide text-dimmed">{{ t("label.input") }}</p>
                  <p class="mt-1 break-all font-mono text-default">{{ apiInput }}</p>
                </div>

                <div class="rounded-xl bg-default px-4 py-3 ring ring-default">
                  <p class="text-xs uppercase tracking-wide text-dimmed">{{ t("label.lang") }}</p>
                  <p class="mt-1 font-mono text-default">{{ apiLang }}</p>
                </div>
              </div>
            </UCard>

            <UCard variant="subtle">
              <template #header>
                <div class="flex items-center justify-between gap-3">
                  <h2 class="text-base font-semibold text-highlighted">
                    {{ t("card.timeline") }}
                  </h2>

                  <div class="flex items-center gap-2">
                    <UButton
                      color="neutral"
                      variant="ghost"
                      size="sm"
                      icon="i-lucide-download"
                      :label="t('button.saveAsSrt')"
                      @click="downloadSrt"
                    />

                    <UButton
                      color="neutral"
                      variant="ghost"
                      size="sm"
                      icon="i-lucide-copy"
                      @click="copyTimeline"
                    />
                  </div>
                </div>
              </template>

              <ol class="max-h-112 divide-y divide-default overflow-auto">
                <li
                  v-for="s in segments"
                  :key="`${s.offset}-${s.text}`"
                  class="flex gap-4 py-3 text-sm"
                >
                  <span class="w-16 shrink-0 font-mono text-dimmed">
                    {{ formatTime(s.offset) }}
                  </span>
                  <p class="leading-6 text-toned">{{ s.text }}</p>
                </li>
              </ol>
            </UCard>
          </div>
        </div>
      </section>
    </UContainer>
  </main>
</template>
