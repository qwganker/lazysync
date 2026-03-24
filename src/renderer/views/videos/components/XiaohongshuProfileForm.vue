<script setup lang="ts">
import { NFormItem, NRadioButton, NRadioGroup, NSelect } from "naive-ui";
import type { UpdateRendererXiaohongshuProfileInput } from "../../../types/video";

defineProps<{
  form: UpdateRendererXiaohongshuProfileInput;
  visibilityOptions: Array<{ label: string; value: UpdateRendererXiaohongshuProfileInput["visibility"] }>;
  submitModeOptions: Array<{ label: string; value: UpdateRendererXiaohongshuProfileInput["submitMode"] }>;
}>();
</script>

<template>
  <div class="platform-config-panel__content">
    <NFormItem label="可见范围">
      <NSelect v-model:value="form.visibility" :options="visibilityOptions" />
    </NFormItem>
    <NFormItem label="提交方式">
      <NRadioGroup v-model:value="form.submitMode" name="xiaohongshu-submit-mode">
        <NRadioButton v-for="option in submitModeOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </NRadioButton>
      </NRadioGroup>
    </NFormItem>
  </div>
</template>

<style scoped>
.platform-config-panel__content {
  padding-top: 12px;
}
</style>
