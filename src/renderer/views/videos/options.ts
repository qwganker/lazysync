import type { RendererVideoPlatform, UpdateRendererXiaohongshuProfileInput } from "../../types/video";

export const DEFAULT_PAGE_SIZE = 8;
export const PAGE_SIZE_OPTIONS = [8, 16, 24];

export const platformLabelMap: Record<RendererVideoPlatform, string> = {
  bilibili: "B站",
  xiaohongshu: "小红书",
};

export const uploadPlatformOptions: Array<{ label: string; value: RendererVideoPlatform }> = [
  { label: "B站", value: "bilibili" },
  { label: "小红书", value: "xiaohongshu" },
];

export const bilibiliPartitionOptions = [
  { label: "影视", value: "影视" },
  { label: "娱乐", value: "娱乐" },
  { label: "音乐", value: "音乐" },
  { label: "舞蹈", value: "舞蹈" },
  { label: "游戏", value: "游戏" },
  { label: "知识", value: "知识" },
];

export const xiaohongshuVisibilityOptions: Array<{ label: string; value: UpdateRendererXiaohongshuProfileInput["visibility"] }> =
  [
    { label: "公开可见", value: "public" },
    { label: "仅自己可见", value: "private" },
    { label: "仅互关好友可见", value: "followers_only" },
  ];

export const xiaohongshuSubmitModeOptions: Array<{ label: string; value: UpdateRendererXiaohongshuProfileInput["submitMode"] }> =
  [
    { label: "暂存离开", value: "draft" },
    { label: "发布", value: "publish" },
  ];
