<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { NText } from "naive-ui";
import type {
  ListRendererVideosInput,
  RendererVideoDetail,
  RendererVideoPlatform,
  UpdateRendererBilibiliProfileInput,
  UpdateRendererVideoAssetInput,
  UpdateRendererXiaohongshuProfileInput,
} from "../../types/video";
import VideoEditModal from "./components/VideoEditModal.vue";
import VideoListTable from "./components/VideoListTable.vue";
import VideoUploadModal from "./components/VideoUploadModal.vue";
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  bilibiliPartitionOptions,
  platformLabelMap,
  uploadPlatformOptions,
  xiaohongshuSubmitModeOptions,
  xiaohongshuVisibilityOptions,
} from "./options";

const videos = ref<RendererVideoDetail[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(DEFAULT_PAGE_SIZE);
const isLoading = ref(true);
const isCreating = ref(false);
const isSaving = ref(false);
const deletingVideoId = ref<string | null>(null);
const uploadingVideoId = ref<string | null>(null);
const editingVideoId = ref<string | null>(null);
const pendingUploadVideo = ref<RendererVideoDetail | null>(null);
const editModalVisible = ref(false);
const uploadModalVisible = ref(false);
const errorMessage = ref<string | null>(null);
const noticeMessage = ref<string | null>(null);
const selectedUploadPlatform = ref<RendererVideoPlatform>("bilibili");
const lastSuccessfulUploadPlatform = ref<RendererVideoPlatform>("bilibili");
const activeEditPlatformTab = ref<RendererVideoPlatform>("bilibili");
const bilibiliVideoTypeValue = ref<string>("自制");

const assetEditForm = reactive<UpdateRendererVideoAssetInput>({
  title: "",
  summary: null,
});

const bilibiliEditForm = reactive<UpdateRendererBilibiliProfileInput>({
  publishMode: "draft",
  videoType: "自制",
  partition: "娱乐",
  visibility: "private",
  tags: [],
});

const xiaohongshuEditForm = reactive<UpdateRendererXiaohongshuProfileInput>({
  visibility: "private",
  submitMode: "draft",
});

function resetXiaohongshuEditForm(): void {
  xiaohongshuEditForm.visibility = "private";
  xiaohongshuEditForm.submitMode = "draft";
}

function normalizeBilibiliTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const normalizedTags: string[] = [];

  for (const tag of tags) {
    const trimmedTag = tag.trim();
    if (!trimmedTag || seen.has(trimmedTag)) {
      continue;
    }

    seen.add(trimmedTag);
    normalizedTags.push(trimmedTag);
  }

  return normalizedTags.slice(0, 10);
}

async function loadVideos(): Promise<void> {
  await loadVideosPage({
    page: currentPage.value,
    pageSize: pageSize.value,
  });
}

async function loadVideosPage(input: ListRendererVideosInput): Promise<void> {
  isLoading.value = true;

  try {
    const response = await window.desktop.videos.list(input);
    videos.value = response.items;
    total.value = response.total;
    currentPage.value = response.page;
    pageSize.value = response.pageSize;
  } finally {
    isLoading.value = false;
  }
}

async function handlePageChange(page: number): Promise<void> {
  await loadVideosPage({
    page,
    pageSize: pageSize.value,
  });
}

async function handlePageSizeChange(nextPageSize: number): Promise<void> {
  await loadVideosPage({
    page: 1,
    pageSize: nextPageSize,
  });
}

async function handleAddVideo(): Promise<void> {
  isCreating.value = true;
  errorMessage.value = null;
  noticeMessage.value = null;

  try {
    const localPath = await window.desktop.system.pickVideoFile();
    if (!localPath) {
      return;
    }

    await window.desktop.videos.create({ localPath });
    await loadVideosPage({
      page: 1,
      pageSize: pageSize.value,
    });
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "添加视频失败。";
  } finally {
    isCreating.value = false;
  }
}

async function openEditModal(video: RendererVideoDetail): Promise<void> {
  editingVideoId.value = video.asset.id;
  activeEditPlatformTab.value = "bilibili";
  assetEditForm.title = video.asset.title;
  assetEditForm.summary = video.asset.summary;

  const currentBilibiliProfile = video.platformProfiles.find((profile) => profile.platform === "bilibili");
  bilibiliEditForm.publishMode = currentBilibiliProfile?.config.publishMode ?? "draft";
  bilibiliEditForm.videoType = currentBilibiliProfile?.config.videoType ?? "自制";
  bilibiliVideoTypeValue.value = currentBilibiliProfile?.config.videoType ?? "自制";
  bilibiliEditForm.partition = currentBilibiliProfile?.config.partition ?? "娱乐";
  bilibiliEditForm.visibility = currentBilibiliProfile?.config.visibility ?? "private";
  bilibiliEditForm.tags = normalizeBilibiliTags(currentBilibiliProfile?.config.tags ?? []);

  const currentXiaohongshuProfile = video.platformProfiles.find((profile) => profile.platform === "xiaohongshu");
  xiaohongshuEditForm.visibility = currentXiaohongshuProfile?.config.visibility ?? "private";
  xiaohongshuEditForm.submitMode = currentXiaohongshuProfile?.config.submitMode ?? "draft";

  errorMessage.value = null;
  noticeMessage.value = null;

  try {
    const [nextBilibiliProfile, nextXiaohongshuProfile] = await Promise.all([
      window.desktop.platforms.getProfile(video.asset.id, "bilibili"),
      window.desktop.platforms.getProfile(video.asset.id, "xiaohongshu"),
    ]);

    if (nextBilibiliProfile) {
      bilibiliEditForm.publishMode = nextBilibiliProfile.config.publishMode;
      bilibiliEditForm.videoType = nextBilibiliProfile.config.videoType ?? "自制";
      bilibiliVideoTypeValue.value = nextBilibiliProfile.config.videoType ?? "自制";
      bilibiliEditForm.partition = nextBilibiliProfile.config.partition ?? "娱乐";
      bilibiliEditForm.visibility = nextBilibiliProfile.config.visibility;
      bilibiliEditForm.tags = normalizeBilibiliTags(nextBilibiliProfile.config.tags);
    }

    if (nextXiaohongshuProfile) {
      xiaohongshuEditForm.visibility = nextXiaohongshuProfile.config.visibility;
      xiaohongshuEditForm.submitMode = nextXiaohongshuProfile.config.submitMode;
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "读取平台配置失败。";
  }

  editModalVisible.value = true;
}

function closeEditModal(): void {
  editModalVisible.value = false;
  editingVideoId.value = null;
  bilibiliVideoTypeValue.value = "自制";
  bilibiliEditForm.tags = [];
  activeEditPlatformTab.value = "bilibili";
  resetXiaohongshuEditForm();
}

function handleEditModalShowUpdate(show: boolean): void {
  if (show) {
    editModalVisible.value = true;
    return;
  }

  closeEditModal();
}

function openUploadModal(video: RendererVideoDetail): void {
  pendingUploadVideo.value = video;
  selectedUploadPlatform.value = lastSuccessfulUploadPlatform.value;
  errorMessage.value = null;
  noticeMessage.value = null;
  uploadModalVisible.value = true;
}

function closeUploadModal(): void {
  uploadModalVisible.value = false;
  pendingUploadVideo.value = null;
}

function handleUploadModalShowUpdate(show: boolean): void {
  if (show) {
    uploadModalVisible.value = true;
    return;
  }

  closeUploadModal();
}

async function handleSaveVideo(): Promise<void> {
  if (!editingVideoId.value) {
    return;
  }

  isSaving.value = true;
  errorMessage.value = null;
  noticeMessage.value = null;

  try {
    await window.desktop.videos.updateAsset(editingVideoId.value, {
      title: assetEditForm.title.trim(),
      summary: assetEditForm.summary?.trim() ? assetEditForm.summary.trim() : null,
    });
    await window.desktop.platforms.updateProfile(editingVideoId.value, "bilibili", {
      publishMode: bilibiliEditForm.publishMode,
      videoType: bilibiliEditForm.videoType,
      partition: bilibiliEditForm.partition,
      visibility: bilibiliEditForm.visibility,
      tags: normalizeBilibiliTags(bilibiliEditForm.tags),
    });
    await window.desktop.platforms.updateProfile(editingVideoId.value, "xiaohongshu", {
      visibility: xiaohongshuEditForm.visibility,
      submitMode: xiaohongshuEditForm.submitMode,
    });
    closeEditModal();
    await loadVideos();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "保存视频失败。";
  } finally {
    isSaving.value = false;
  }
}

async function handleConfirmUpload(): Promise<void> {
  const video = pendingUploadVideo.value;
  const platform = selectedUploadPlatform.value;
  if (!video) {
    return;
  }

  uploadingVideoId.value = video.asset.id;
  errorMessage.value = null;
  noticeMessage.value = null;

  try {
    const response = await window.desktop.videos.upload(video.asset.id, platform);
    noticeMessage.value = response.message || null;
    lastSuccessfulUploadPlatform.value = platform;
    closeUploadModal();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : `${getPlatformLabel(platform)}上传失败。`;
  } finally {
    uploadingVideoId.value = null;
  }
}

async function handleDeleteVideo(videoId: string): Promise<void> {
  deletingVideoId.value = videoId;
  errorMessage.value = null;
  noticeMessage.value = null;

  try {
    await window.desktop.videos.delete(videoId);
    const nextTotal = Math.max(total.value - 1, 0);
    const maxPageAfterDelete = Math.max(1, Math.ceil(nextTotal / pageSize.value));
    await loadVideosPage({
      page: Math.min(currentPage.value, maxPageAfterDelete),
      pageSize: pageSize.value,
    });
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "删除视频失败。";
  } finally {
    deletingVideoId.value = null;
  }
}

async function handlePreviewVideo(video: RendererVideoDetail): Promise<void> {
  errorMessage.value = null;
  noticeMessage.value = null;

  if (!video.asset.localPath) {
    errorMessage.value = "视频缺少本地文件路径，无法预览。";
    return;
  }

  try {
    const openPath = window.desktop.system?.openPath;
    if (typeof openPath !== "function") {
      errorMessage.value = "当前应用版本不支持本地预览，请重启应用后重试。";
      return;
    }

    const result = await openPath(video.asset.localPath);
    if (!result.success) {
      errorMessage.value = result.error ?? "打开本地视频失败。";
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "打开本地视频失败。";
  }
}

function formatDateTime(value: string): string {
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

function getPlatformLabel(platform: RendererVideoPlatform): string {
  return platformLabelMap[platform];
}

onMounted(() => {
  void loadVideos();
});
</script>

<template>
  <div class="video-list-page">
    <div class="video-list-page__shell">
      <div class="content-panel">
        <div v-if="errorMessage" class="content-card__error">
          <NText type="error">{{ errorMessage }}</NText>
        </div>

        <div v-if="noticeMessage" class="content-card__notice">
          <NText type="success">{{ noticeMessage }}</NText>
        </div>

        <VideoListTable
          :videos="videos"
          :total="total"
          :current-page="currentPage"
          :page-size="pageSize"
          :page-size-options="PAGE_SIZE_OPTIONS"
          :is-loading="isLoading"
          :is-creating="isCreating"
          :deleting-video-id="deletingVideoId"
          :uploading-video-id="uploadingVideoId"
          :format-date-time="formatDateTime"
          @add-video="handleAddVideo"
          @page-change="handlePageChange"
          @page-size-change="handlePageSizeChange"
          @preview="handlePreviewVideo"
          @upload="openUploadModal"
          @edit="openEditModal"
          @delete="handleDeleteVideo"
        />
      </div>
    </div>

    <VideoUploadModal
      :show="uploadModalVisible"
      :pending-video="pendingUploadVideo"
      :selected-platform="selectedUploadPlatform"
      :platform-options="uploadPlatformOptions"
      :platform-label-map="platformLabelMap"
      :uploading-video-id="uploadingVideoId"
      @update:show="handleUploadModalShowUpdate"
      @update:selected-platform="selectedUploadPlatform = $event"
      @confirm="handleConfirmUpload"
    />

    <VideoEditModal
      :show="editModalVisible"
      :is-saving="isSaving"
      :active-platform-tab="activeEditPlatformTab"
      :asset-edit-form="assetEditForm"
      :bilibili-edit-form="bilibiliEditForm"
      :bilibili-video-type-value="bilibiliVideoTypeValue"
      :xiaohongshu-edit-form="xiaohongshuEditForm"
      :bilibili-partition-options="bilibiliPartitionOptions"
      :xiaohongshu-visibility-options="xiaohongshuVisibilityOptions"
      :xiaohongshu-submit-mode-options="xiaohongshuSubmitModeOptions"
      @update:show="handleEditModalShowUpdate"
      @update:active-platform-tab="activeEditPlatformTab = $event"
      @update:bilibili-video-type-value="bilibiliVideoTypeValue = $event"
      @save="handleSaveVideo"
    />
  </div>
</template>

<style scoped>
.video-list-page {
  min-height: 100%;
  padding: 8px 32px 32px;
}

.video-list-page__shell {
  max-width: 1280px;
  margin: 0 auto;
}

.content-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.content-card__error,
.content-card__notice {
  margin-bottom: 16px;
}

@media (max-width: 768px) {
  .video-list-page {
    padding: 8px 20px 20px;
  }

}
</style>
