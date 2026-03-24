import type { AppHealthCheckResult } from "./health";
import type { PlatformProfileMap, VideoPlatform, VideoPlatformProfile } from "./platforms";
import type { ListVideosInput, PaginatedVideoDetails, UpdateVideoAssetInput, VideoDetail } from "./video";

export type UpdateDesktopVideoAssetInput = UpdateVideoAssetInput;
export type DesktopVideoDetail = VideoDetail;
export type ListDesktopVideosInput = ListVideosInput;
export type PaginatedDesktopVideoDetails = PaginatedVideoDetails;
export type DesktopPlatformProfile = VideoPlatformProfile;
export type UpdateDesktopPlatformProfileInput<TPlatform extends VideoPlatform> = PlatformProfileMap[TPlatform]["config"];

export interface DesktopVideoUploadResponse {
  success: boolean;
  message: string;
}

export interface DesktopApi {
  system: {
    pickVideoFile: () => Promise<string | null>;
    openPath: (targetPath: string) => Promise<{ success: boolean; error: string | null }>;
    checkHealth: () => Promise<AppHealthCheckResult>;
  };
  videos: {
    list: (input: ListDesktopVideosInput) => Promise<PaginatedDesktopVideoDetails>;
    create: (input: { localPath: string }) => Promise<DesktopVideoDetail>;
    updateAsset: (videoId: string, input: UpdateDesktopVideoAssetInput) => Promise<DesktopVideoDetail>;
    upload: (videoId: string, platform: VideoPlatform) => Promise<DesktopVideoUploadResponse>;
    delete: (videoId: string) => Promise<{ success: boolean; id: string }>;
  };
  platforms: {
    getProfile: <TPlatform extends VideoPlatform>(videoId: string, platform: TPlatform) => Promise<PlatformProfileMap[TPlatform] | null>;
    updateProfile: <TPlatform extends VideoPlatform>(
      videoId: string,
      platform: TPlatform,
      input: UpdateDesktopPlatformProfileInput<TPlatform>,
    ) => Promise<PlatformProfileMap[TPlatform]>;
  };
}

declare global {
  interface Window {
    desktop: DesktopApi;
  }
}
