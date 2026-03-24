export type VideoPlatform = "bilibili" | "xiaohongshu";

export type BilibiliPublishMode = "draft" | "publish";
export type BilibiliVideoType = "自制" | "转载";
export type BilibiliVisibility = "public" | "private";
export type XiaohongshuVisibility = "public" | "private" | "followers_only";
export type XiaohongshuSubmitMode = "draft" | "publish";

export interface PlatformProfileBase<TPlatform extends VideoPlatform, TConfig> {
  id: string;
  videoId: string;
  platform: TPlatform;
  enabled: boolean;
  config: TConfig;
  createdAt: string;
  updatedAt: string;
}

export interface BilibiliProfileConfig {
  publishMode: BilibiliPublishMode;
  videoType: BilibiliVideoType | null;
  partition: string | null;
  visibility: BilibiliVisibility;
  tags: string[];
}

export type BilibiliPlatformProfile = PlatformProfileBase<"bilibili", BilibiliProfileConfig>;

export interface XiaohongshuProfileConfig {
  visibility: XiaohongshuVisibility;
  submitMode: XiaohongshuSubmitMode;
}

export type XiaohongshuPlatformProfile = PlatformProfileBase<"xiaohongshu", XiaohongshuProfileConfig>;

export interface PlatformProfileMap {
  bilibili: BilibiliPlatformProfile;
  xiaohongshu: XiaohongshuPlatformProfile;
}

export type VideoPlatformProfile = PlatformProfileMap[VideoPlatform];
