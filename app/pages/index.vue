<script setup lang="ts">
const TEST_VIDEO_URL = "UF8uR6Z6KLc";

const { locale, locales, setLocale } = useI18n();
const toast = useToast();

type Segment = { text: string; duration: number; offset: number; lang: string };
type ApiError = {
  statusMessage?: string;
  message?: string;
  data?: { statusMessage?: string; message?: string; availableLangs?: string[] };
};

useSeoMeta({ title: $t("title"), description: $t("description") });

const input = ref("");
const lang = ref("en");
const pending = ref(false);
const error = ref("");
const availableLangs = ref<string[]>([]);
const transcript = ref<Segment[] | null>(null);

const segments = computed(() => transcript.value ?? []);
const hasResult = computed(() => segments.value.length > 0);

const apiInput = computed(() => input.value.trim() || TEST_VIDEO_URL);
const apiLang = computed(() => lang.value.trim() || "auto");

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
  if (pending.value) return $t("status.pending");
  if (hasResult.value) return $t("status.success");
  return $t("status.idle");
});

const apiQuery = computed(() => {
  const params = new URLSearchParams({ input: apiInput.value });
  if (lang.value.trim()) params.set("lang", lang.value.trim());
  return params.toString();
});

const curlCommand = computed(
  () => `curl "${window.location.origin}/api/transcript?${apiQuery.value}"`,
);

async function fetchTranscript() {
  const inputValue = input.value.trim();
  const langValue = lang.value.trim();

  if (!inputValue) {
    error.value = $t("error.emptyInput");
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
    () => toast.add({ title: $t("toast.copied"), color: "success", icon: "i-lucide-check" }),
    () => toast.add({ title: $t("toast.copyFailed"), color: "error", icon: "i-lucide-x" }),
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
    $t("error.fetchFailed")
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
            {{ $t("description") }}
          </p>
        </div>

        <form class="w-full space-y-4" @submit.prevent="fetchTranscript">
          <UInput
            v-model="input"
            color="neutral"
            icon="i-lucide-search"
            :placeholder="$t('placeholder.source')"
            size="xl"
            variant="outline"
            class="w-full"
            :ui="{ base: 'h-14 rounded-full px-6 text-base shadow-sm' }"
          />

          <div class="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <UInput
              v-model="lang"
              color="neutral"
              icon="i-lucide-languages"
              :placeholder="$t('placeholder.lang')"
              size="lg"
              variant="soft"
              class="w-full sm:w-40"
              :ui="{ base: 'rounded-full' }"
            />

            <div class="flex flex-wrap justify-center gap-3">
              <UButton
                type="submit"
                size="lg"
                :loading="pending"
                trailing-icon="i-lucide-arrow-right"
              >
                {{ $t("button.extract") }}
              </UButton>

              <UButton
                color="neutral"
                size="lg"
                variant="soft"
                trailing-icon="i-lucide-flask-conical"
                @click.prevent="useTestVideo"
              >
                {{ $t("button.useTestVideo") }}
              </UButton>

              <UButton
                color="neutral"
                size="lg"
                variant="ghost"
                :href="`/api/transcript?${apiQuery}`"
                target="_blank"
              >
                {{ $t("button.viewApi") }}
              </UButton>
            </div>
          </div>

          <UAlert
            v-if="error"
            color="error"
            variant="soft"
            :title="$t('alert.fetchFailed')"
            :description="error"
          />

          <UAlert
            v-if="availableLangs.length"
            color="warning"
            variant="soft"
            :title="$t('alert.availableLangs')"
            :description="availableLangs.join(', ')"
          />
        </form>
      </section>

      <section v-if="hasResult" class="mx-auto w-full max-w-5xl space-y-4 pb-8">
        <div class="flex flex-wrap gap-2">
          <UBadge color="neutral" variant="soft">{{ $t("label.status") }} {{ statusLabel }}</UBadge>
          <UBadge color="neutral" variant="soft"
            >{{ segments.length }} {{ $t("label.segments") }}</UBadge
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
                    {{ $t("card.transcriptFull") }}
                  </h2>
                  <p class="truncate text-sm text-muted">{{ input }}</p>
                </div>

                <div class="flex items-center gap-2">
                  <UBadge color="neutral" variant="soft" class="shrink-0">
                    {{ $t("label.plainText") }}
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
              <p class="text-xs leading-5 text-muted">{{ $t("hint") }}</p>

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
                  <h2 class="text-base font-semibold text-highlighted">{{ $t("card.apiCall") }}</h2>

                  <UButton
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    icon="i-lucide-terminal"
                    :label="$t('button.copyAsCurl')"
                    @click="copyCurl"
                  />
                </div>
              </template>

              <div class="space-y-3 text-sm text-toned">
                <div class="rounded-xl bg-default px-4 py-3 ring ring-default">
                  <p class="font-mono text-default">GET /api/transcript</p>
                </div>

                <div class="rounded-xl bg-default px-4 py-3 ring ring-default">
                  <p class="text-xs uppercase tracking-wide text-dimmed">{{ $t("label.input") }}</p>
                  <p class="mt-1 break-all font-mono text-default">{{ apiInput }}</p>
                </div>

                <div class="rounded-xl bg-default px-4 py-3 ring ring-default">
                  <p class="text-xs uppercase tracking-wide text-dimmed">{{ $t("label.lang") }}</p>
                  <p class="mt-1 font-mono text-default">{{ apiLang }}</p>
                </div>
              </div>
            </UCard>

            <UCard variant="subtle">
              <template #header>
                <div class="flex items-center justify-between gap-3">
                  <h2 class="text-base font-semibold text-highlighted">
                    {{ $t("card.timeline") }}
                  </h2>

                  <UButton
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    icon="i-lucide-copy"
                    @click="copyTimeline"
                  />
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
