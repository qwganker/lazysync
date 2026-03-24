import type { PlatformProfileMap, VideoPlatform } from "../../../shared/types/platforms";
import type { VideoAsset } from "../../../shared/types/video";
import { uploadVideoToBilibili } from "./bilibili";
import { uploadVideoToXiaohongshu } from "./xiaohongshu";

const activeUploads = new Map<VideoPlatform, Promise<{ success: boolean; message: string }>>();

export function getPlatformLabel(platform: VideoPlatform): string {
  switch (platform) {
    case "bilibili":
      return "B站";
    case "xiaohongshu":
      return "小红书";
    default:
      return platform;
  }
}

export async function uploadVideoToPlatform<TPlatform extends VideoPlatform>(
  platform: TPlatform,
  video: VideoAsset,
  profile: PlatformProfileMap[TPlatform],
): Promise<{ success: boolean; message: string }> {
  if (activeUploads.has(platform)) {
    throw new Error(`${getPlatformLabel(platform)}已有上传流程正在执行，请先等待当前流程完成后再试。`);
  }

  const uploadTask = (async (): Promise<{ success: boolean; message: string }> => {
    switch (platform) {
      case "bilibili":
        return uploadVideoToBilibili(video, profile as PlatformProfileMap["bilibili"]);
      case "xiaohongshu":
        return uploadVideoToXiaohongshu(video, profile as PlatformProfileMap["xiaohongshu"]);
      default:
        throw new Error(`不支持的平台：${String(platform)}`);
    }
  })();

  activeUploads.set(platform, uploadTask);

  try {
    return await uploadTask;
  } finally {
    if (activeUploads.get(platform) === uploadTask) {
      activeUploads.delete(platform);
    }
  }
}
