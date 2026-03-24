<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { NButton, NCard, NTag, NText } from "naive-ui";
import type { RendererAppHealthCheckResult, RendererHealthCheckItem, RendererHealthStatus } from "../../types/health";

const healthResult = ref<RendererAppHealthCheckResult | null>(null);
const isChecking = ref(true);

function createFallbackResult(message: string): RendererAppHealthCheckResult {
  return {
    overallStatus: "unavailable",
    browserRuntime: {
      status: "unavailable",
      message,
    },
    playwrightLaunch: {
      status: "skipped",
      message: "已跳过 Playwright 浏览器启动检查，因为健康检查请求失败。",
    },
    checkedAt: new Date().toISOString(),
  };
}

const healthItems = computed<Array<{ key: string; title: string; item: RendererHealthCheckItem | null }>>(() => [
  {
    key: "browser-runtime",
    title: "浏览器运行时",
    item: healthResult.value?.browserRuntime ?? null,
  },
  {
    key: "playwright-launch",
    title: "Playwright 启动能力",
    item: healthResult.value?.playwrightLaunch ?? null,
  },
]);

const checkedAtDisplay = computed(() => formatCheckedAt(healthResult.value?.checkedAt ?? null));

function getStatusLabel(status: RendererHealthStatus | "checking"): string {
  switch (status) {
    case "available":
      return "可用";
    case "unavailable":
      return "不可用";
    case "skipped":
      return "已跳过";
    case "checking":
      return "检测中";
  }
}

function getStatusType(status: RendererHealthStatus | "checking"): "default" | "info" | "success" | "warning" | "error" {
  switch (status) {
    case "available":
      return "success";
    case "unavailable":
      return "error";
    case "skipped":
      return "warning";
    case "checking":
      return "info";
  }
}

function formatCheckedAt(value: string | null): string {
  if (!value) {
    return "等待检测完成";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

async function runCheck(): Promise<void> {
  isChecking.value = true;

  try {
    healthResult.value = await window.desktop.system.checkHealth();
  } catch (error) {
    const message = error instanceof Error ? error.message : "健康检查请求失败，请稍后重试。";
    healthResult.value = createFallbackResult(message);
  } finally {
    isChecking.value = false;
  }
}

onMounted(() => {
  void runCheck();
});
</script>

<template>
  <section class="home-view">
    <div class="home-view__grid home-view__grid--flat">
      <NCard
        class="health-card status-card"
        size="large"
        embedded
      >
        <div class="health-card__header">
          <h2 class="health-card__title">环境可用性状态</h2>
          <NTag round :type="healthResult?.overallStatus === 'available' ? 'success' : isChecking ? 'info' : 'error'">
            {{ isChecking && !healthResult ? "检测中" : healthResult?.overallStatus === "available" ? "可用" : "不可用" }}
          </NTag>
        </div>
        <div class="health-card__footer">
          <NButton data-testid="retry-health-check" type="primary" secondary :loading="isChecking" @click="runCheck">
            重新检测
          </NButton>
          <NText depth="3">{{ checkedAtDisplay }}</NText>
        </div>
      </NCard>

      <NCard
        v-for="entry in healthItems"
        :key="entry.key"
        class="health-card status-card"
        size="large"
        embedded
      >
        <div class="health-card__header">
          <h2 class="health-card__title">{{ entry.title }}</h2>
          <NTag :type="getStatusType(entry.item?.status ?? 'checking')" round>
            {{ getStatusLabel(entry.item?.status ?? "checking") }}
          </NTag>
        </div>
        <p class="health-card__message">
          {{ entry.item?.message ?? "正在收集该项状态，请稍候。" }}
        </p>
      </NCard>
    </div>
  </section>
</template>

<style scoped>
.home-view {
  width: min(1120px, 100%);
  margin: 0 auto;
  padding: 8px 0 56px;
}

.status-card {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.84), rgba(248, 250, 252, 0.78));
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.06);
  backdrop-filter: blur(16px);
}

.home-view__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  margin-top: 22px;
}

.home-view__grid--flat {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: stretch;
  margin-top: 0;
}

.health-card {
  overflow: hidden;
}

.health-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.health-card__title {
  margin: 0;
  font-size: 20px;
}

.health-card__message {
  margin: 0;
  color: #475569;
  line-height: 1.7;
  white-space: pre-wrap;
}

.health-card__footer {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}

@media (max-width: 1100px) {
  .home-view__grid--flat {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 800px) {
  .home-view__grid {
    grid-template-columns: 1fr;
  }

  .health-card__header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
