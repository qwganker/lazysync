<script setup lang="ts">
import { AddOutline, CloudUploadOutline, CreateOutline, PlayOutline, TrashOutline } from "@vicons/ionicons5";
import { NButton, NEmpty, NIcon, NPagination, NPopconfirm, NTooltip } from "naive-ui";
import type { RendererVideoDetail } from "../../../types/video";

defineProps<{
  videos: RendererVideoDetail[];
  total: number;
  currentPage: number;
  pageSize: number;
  pageSizeOptions: number[];
  isLoading: boolean;
  isCreating: boolean;
  deletingVideoId: string | null;
  uploadingVideoId: string | null;
  formatDateTime: (value: string) => string;
}>();

const emit = defineEmits<{
  (event: "add-video"): void;
  (event: "page-change", value: number): void;
  (event: "page-size-change", value: number): void;
  (event: "preview", video: RendererVideoDetail): void;
  (event: "upload", video: RendererVideoDetail): void;
  (event: "edit", video: RendererVideoDetail): void;
  (event: "delete", videoId: string): void;
}>();

function renderPaginationPrefix({ itemCount }: { itemCount: number | undefined }): string {
  return `共 ${itemCount ?? 0} 条`;
}
</script>

<template>
  <div v-if="total === 0" class="content-card__empty">
    <NEmpty :description="isLoading ? '正在读取视频列表…' : '当前还没有视频记录'">
      <template #extra>
        <NButton type="primary" secondary :loading="isCreating" @click="emit('add-video')">添加视频</NButton>
      </template>
    </NEmpty>
  </div>

  <div v-else class="video-table-wrapper">
    <div class="video-table-toolbar">
      <NButton type="primary" size="medium" :loading="isCreating" @click="emit('add-video')">
        <template #icon>
          <NIcon>
            <AddOutline />
          </NIcon>
        </template>
        添加视频
      </NButton>
    </div>
    <table class="video-table">
      <thead>
        <tr>
          <th>标题</th>
          <th>文件名</th>
          <th>文件路径</th>
          <th>添加时间</th>
          <th>格式</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="video in videos" :key="video.asset.id">
          <td class="video-table__title-cell">
            <NTooltip :delay="500">
              <template #trigger>
                <span class="video-table__ellipsis">{{ video.asset.title }}</span>
              </template>
              {{ video.asset.title }}
            </NTooltip>
          </td>
          <td class="video-table__file-name-cell">
            <NTooltip :delay="500">
              <template #trigger>
                <span class="video-table__ellipsis">{{ video.asset.fileName }}</span>
              </template>
              {{ video.asset.fileName }}
            </NTooltip>
          </td>
          <td class="video-table__path-cell">
            <NTooltip :delay="500">
              <template #trigger>
                <span class="video-table__ellipsis">{{ video.asset.localPath }}</span>
              </template>
              {{ video.asset.localPath }}
            </NTooltip>
          </td>
          <td class="video-table__time-cell">{{ formatDateTime(video.asset.createdAt) }}</td>
          <td>{{ video.asset.format ?? "未知格式" }}</td>
          <td>
            <div class="video-table__actions">
              <NTooltip :delay="500">
                <template #trigger>
                  <NButton circle size="small" secondary @click="emit('preview', video)">
                    <template #icon>
                      <NIcon>
                        <PlayOutline />
                      </NIcon>
                    </template>
                  </NButton>
                </template>
                预览
              </NTooltip>
              <NTooltip :delay="500">
                <template #trigger>
                  <NButton
                    circle
                    size="small"
                    type="primary"
                    secondary
                    :loading="uploadingVideoId === video.asset.id"
                    @click="emit('upload', video)"
                  >
                    <template #icon>
                      <NIcon>
                        <CloudUploadOutline />
                      </NIcon>
                    </template>
                  </NButton>
                </template>
                上传
              </NTooltip>
              <NTooltip :delay="500">
                <template #trigger>
                  <NButton circle size="small" secondary @click="emit('edit', video)">
                    <template #icon>
                      <NIcon>
                        <CreateOutline />
                      </NIcon>
                    </template>
                  </NButton>
                </template>
                编辑
              </NTooltip>
              <NPopconfirm @positive-click="emit('delete', video.asset.id)">
                <template #trigger>
                  <NTooltip :delay="500">
                    <template #trigger>
                      <NButton circle size="small" tertiary type="error" :loading="deletingVideoId === video.asset.id">
                        <template #icon>
                          <NIcon>
                            <TrashOutline />
                          </NIcon>
                        </template>
                      </NButton>
                    </template>
                    删除
                  </NTooltip>
                </template>
                确认删除这个视频吗？
              </NPopconfirm>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    <div class="video-table-footer">
      <NPagination
        :page="currentPage"
        :page-size="pageSize"
        :item-count="total"
        :page-sizes="pageSizeOptions"
        :prefix="renderPaginationPrefix"
        show-size-picker
        @update:page="emit('page-change', $event)"
        @update:page-size="emit('page-size-change', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.content-card__empty {
  min-height: 360px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-table-wrapper {
  overflow-x: auto;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 10px 24px rgba(148, 163, 184, 0.12);
}

.video-table-toolbar {
  display: flex;
  justify-content: flex-end;
  padding: 16px 18px 12px;
}

.video-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 980px;
}

.video-table th,
.video-table td {
  padding: 16px 18px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.9);
  text-align: left;
  vertical-align: top;
  color: #334155;
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.video-table th {
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  background: rgba(248, 250, 252, 0.96);
  white-space: nowrap;
}

.video-table tbody tr:last-child td {
  border-bottom: none;
}

.video-table tbody tr {
  transition: transform 0.2s ease;
}

.video-table tbody tr:hover td {
  background: rgba(59, 130, 246, 0.08);
  box-shadow:
    inset 0 1px 0 rgba(59, 130, 246, 0.1),
    inset 0 -1px 0 rgba(59, 130, 246, 0.1);
}

.video-table tbody tr:hover .video-table__title-cell {
  color: #0b3b8a;
}

.video-table__title-cell {
  color: #0f172a;
  font-weight: 600;
  width: 180px;
  max-width: 180px;
}

.video-table__file-name-cell {
  width: 220px;
  max-width: 220px;
}

.video-table__path-cell {
  width: 360px;
  max-width: 360px;
  color: #475569;
}

.video-table__time-cell {
  width: 180px;
  white-space: nowrap;
}

.video-table__ellipsis {
  display: inline-block;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video-table__actions {
  display: flex;
  gap: 8px;
  white-space: nowrap;
}

.video-table-footer {
  display: flex;
  justify-content: flex-end;
  padding: 16px 18px;
  border-top: 1px solid rgba(226, 232, 240, 0.9);
}

@media (max-width: 768px) {
  .video-table-toolbar,
  .video-table-footer {
    justify-content: flex-start;
  }
}
</style>
