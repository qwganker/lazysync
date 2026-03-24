import type { VideoPlatformProfile } from "./platforms";

export interface VideoAsset {
  id: string;
  title: string;
  summary: string | null;
  localPath: string;
  fileName: string;
  format: string | null;
  size: number | null;
  selectedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VideoDetail {
  asset: VideoAsset;
  platformProfiles: VideoPlatformProfile[];
}

export interface ListVideosInput {
  page: number;
  pageSize: number;
}

export interface PaginatedVideoDetails {
  items: VideoDetail[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateVideoAssetInput {
  localPath: string;
}

export interface UpdateVideoAssetInput {
  title: string;
  summary: string | null;
}
