<script setup lang="ts">
import { computed } from "vue";
import { NButton, NModal, NRadio, NRadioGroup, NSpace, NText } from "naive-ui";
import type { RendererVideoDetail, RendererVideoPlatform } from "../../../types/video";

const props = defineProps<{
  show: boolean;
  pendingVideo: RendererVideoDetail | null;
  selectedPlatform: RendererVideoPlatform;
  platformOptions: Array<{ label: string; value: RendererVideoPlatform }>;
  platformLabelMap: Record<RendererVideoPlatform, string>;
  uploadingVideoId: string | null;
}>();

const emit = defineEmits<{
  (event: "update:show", value: boolean): void;
  (event: "update:selectedPlatform", value: RendererVideoPlatform): void;
  (event: "confirm"): void;
}>();

const showProxy = computed({
  get: () => props.show,
  set: (value: boolean) => emit("update:show", value),
});

const selectedPlatformProxy = computed({
  get: () => props.selectedPlatform,
  set: (value: RendererVideoPlatform) => emit("update:selectedPlatform", value),
});
</script>

<template>
  <NModal
    v-model:show="showProxy"
    preset="card"
    :title="`上传到${platformLabelMap[selectedPlatform]}`"
    class="upload-modal"
    :style="{ width: '520px', maxWidth: 'calc(100vw - 32px)' }"
  >
    <NSpace vertical :size="16">
      <div class="upload-config-panel">
        <div class="upload-config-panel__header">
          <NText class="upload-config-panel__title">选择平台</NText>
        </div>
        <div class="upload-modal__platform-group">
          <NRadioGroup v-model:value="selectedPlatformProxy" name="upload-platform" class="upload-modal__platform-radios">
            <NRadio v-for="option in platformOptions" :key="option.value" :value="option.value" class="upload-modal__platform-option">
              {{ option.label }}
            </NRadio>
          </NRadioGroup>
        </div>
      </div>
    </NSpace>

    <template #footer>
      <div class="edit-modal__footer">
        <NButton @click="emit('update:show', false)">取消</NButton>
        <NButton type="primary" :loading="uploadingVideoId === pendingVideo?.asset.id" @click="emit('confirm')">
          开始上传到{{ platformLabelMap[selectedPlatform] }}
        </NButton>
      </div>
    </template>
  </NModal>
</template>

<style scoped>
.upload-modal {
  width: min(60vw, calc(100vw - 32px));
}

.upload-modal__platform-group {
  margin-top: 8px;
}

.upload-modal__platform-radios {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.upload-modal__platform-option {
  width: 100%;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(226, 232, 240, 0.95);
}

.upload-config-panel {
  padding: 16px 18px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  border-radius: 16px;
  background: rgba(248, 250, 252, 0.78);
}

.upload-config-panel__header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}

.upload-config-panel__title {
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
}

.edit-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
