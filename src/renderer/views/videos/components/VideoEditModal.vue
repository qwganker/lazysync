<script setup lang="ts">
import { computed } from "vue";
import { NButton, NForm, NFormItem, NInput, NModal, NTabPane, NTabs, NText } from "naive-ui";
import type {
  RendererVideoPlatform,
  UpdateRendererBilibiliProfileInput,
  UpdateRendererVideoAssetInput,
  UpdateRendererXiaohongshuProfileInput,
} from "../../../types/video";
import BilibiliProfileForm from "./BilibiliProfileForm.vue";
import XiaohongshuProfileForm from "./XiaohongshuProfileForm.vue";

const props = defineProps<{
  show: boolean;
  isSaving: boolean;
  activePlatformTab: RendererVideoPlatform;
  assetEditForm: UpdateRendererVideoAssetInput;
  bilibiliEditForm: UpdateRendererBilibiliProfileInput;
  bilibiliVideoTypeValue: string;
  xiaohongshuEditForm: UpdateRendererXiaohongshuProfileInput;
  bilibiliPartitionOptions: Array<{ label: string; value: string }>;
  xiaohongshuVisibilityOptions: Array<{ label: string; value: UpdateRendererXiaohongshuProfileInput["visibility"] }>;
  xiaohongshuSubmitModeOptions: Array<{ label: string; value: UpdateRendererXiaohongshuProfileInput["submitMode"] }>;
}>();

const emit = defineEmits<{
  (event: "update:show", value: boolean): void;
  (event: "update:active-platform-tab", value: RendererVideoPlatform): void;
  (event: "update:bilibili-video-type-value", value: string): void;
  (event: "save"): void;
}>();

const showProxy = computed({
  get: () => props.show,
  set: (value: boolean) => emit("update:show", value),
});

const activePlatformTabProxy = computed({
  get: () => props.activePlatformTab,
  set: (value: RendererVideoPlatform) => emit("update:active-platform-tab", value),
});
</script>

<template>
  <NModal
    v-model:show="showProxy"
    preset="card"
    title="编辑视频"
    class="edit-modal"
    :style="{ width: '720px', maxWidth: 'calc(100vw - 32px)' }"
  >
    <NForm label-placement="top">
      <NFormItem label="标题">
        <NInput v-model:value="assetEditForm.title" maxlength="120" />
      </NFormItem>
      <NFormItem label="简介">
        <NInput v-model:value="assetEditForm.summary" type="textarea" :autosize="{ minRows: 3, maxRows: 6 }" />
      </NFormItem>
      <div class="platform-config-panel">
        <div class="platform-config-panel__header">
          <NText class="platform-config-panel__title">平台配置</NText>
        </div>
        <NTabs v-model:value="activePlatformTabProxy" type="line" animated>
          <NTabPane name="bilibili" tab="B站">
            <BilibiliProfileForm
              :form="bilibiliEditForm"
              :video-type-value="bilibiliVideoTypeValue"
              :partition-options="bilibiliPartitionOptions"
              @update:video-type-value="emit('update:bilibili-video-type-value', $event)"
            />
          </NTabPane>
          <NTabPane name="xiaohongshu" tab="小红书">
            <XiaohongshuProfileForm
              :form="xiaohongshuEditForm"
              :visibility-options="xiaohongshuVisibilityOptions"
              :submit-mode-options="xiaohongshuSubmitModeOptions"
            />
          </NTabPane>
        </NTabs>
      </div>
    </NForm>

    <template #footer>
      <div class="edit-modal__footer">
        <NButton @click="emit('update:show', false)">取消</NButton>
        <NButton type="primary" :loading="isSaving" @click="emit('save')">保存</NButton>
      </div>
    </template>
  </NModal>
</template>

<style scoped>
.edit-modal {
  width: min(60vw, calc(100vw - 32px));
}

.platform-config-panel {
  margin-top: 8px;
  padding: 16px 18px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  border-radius: 16px;
  background: rgba(248, 250, 252, 0.78);
}

.platform-config-panel__header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}

.platform-config-panel__title {
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
