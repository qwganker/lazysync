<script setup lang="ts">
import { NFormItem, NRadioButton, NRadioGroup, NSelect } from "naive-ui";
import type { UpdateRendererBilibiliProfileInput } from "../../../types/video";

defineProps<{
  form: UpdateRendererBilibiliProfileInput;
  videoTypeValue: string;
  partitionOptions: Array<{ label: string; value: string }>;
}>();

const emit = defineEmits<{
  (event: "update:video-type-value", value: string): void;
}>();
</script>

<template>
  <div class="platform-config-panel__content">
    <NFormItem label="发布模式">
      <NRadioGroup v-model:value="form.publishMode" name="publish-mode">
        <NRadioButton value="draft">存草稿</NRadioButton>
        <NRadioButton value="publish">立即投稿</NRadioButton>
      </NRadioGroup>
    </NFormItem>
    <NFormItem label="类型">
      <NRadioGroup
        :value="videoTypeValue"
        name="bilibili-video-type"
        @update:value="
          (value) => {
            emit('update:video-type-value', value);
            form.videoType = value;
          }
        "
      >
        <NRadioButton value="自制">自制</NRadioButton>
        <NRadioButton value="转载">转载</NRadioButton>
      </NRadioGroup>
    </NFormItem>
    <NFormItem label="分区">
      <NSelect v-model:value="form.partition" :options="partitionOptions" clearable />
    </NFormItem>
    <NFormItem label="公开可见">
      <NRadioGroup v-model:value="form.visibility" name="bilibili-visibility">
        <NRadioButton value="public">是</NRadioButton>
        <NRadioButton value="private">否</NRadioButton>
      </NRadioGroup>
    </NFormItem>
  </div>
</template>

<style scoped>
.platform-config-panel__content {
  padding-top: 12px;
}
</style>
