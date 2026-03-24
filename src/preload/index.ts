import { contextBridge, ipcRenderer } from "electron";
import type {
  DesktopApi,
  DesktopVideoDetail,
  ListDesktopVideosInput,
  PaginatedDesktopVideoDetails,
  UpdateDesktopPlatformProfileInput,
  UpdateDesktopVideoAssetInput,
} from "../shared/types/electron";
import type { PlatformProfileMap, VideoPlatform } from "../shared/types/platforms";

const desktopApi: DesktopApi = {
  system: {
    pickVideoFile: (): Promise<string | null> => ipcRenderer.invoke("system:pick-video-file"),
    openPath: (targetPath: string): Promise<{ success: boolean; error: string | null }> => ipcRenderer.invoke("system:open-path", targetPath),
    checkHealth: () => ipcRenderer.invoke("system:health-check"),
  },
  videos: {
    list: (input: ListDesktopVideosInput): Promise<PaginatedDesktopVideoDetails> => ipcRenderer.invoke("videos:list", input),
    create: (input: { localPath: string }): Promise<DesktopVideoDetail> => ipcRenderer.invoke("videos:create", input),
    updateAsset: (videoId: string, input: UpdateDesktopVideoAssetInput): Promise<DesktopVideoDetail> =>
      ipcRenderer.invoke("videos:update-asset", videoId, input),
    upload: (videoId: string, platform: VideoPlatform) => ipcRenderer.invoke("videos:upload", videoId, platform),
    delete: (videoId: string) => ipcRenderer.invoke("videos:delete", videoId),
  },
  platforms: {
    getProfile: <TPlatform extends VideoPlatform>(videoId: string, platform: TPlatform): Promise<PlatformProfileMap[TPlatform] | null> =>
      ipcRenderer.invoke("platforms:get", videoId, platform),
    updateProfile: <TPlatform extends VideoPlatform>(
      videoId: string,
      platform: TPlatform,
      input: UpdateDesktopPlatformProfileInput<TPlatform>,
    ): Promise<PlatformProfileMap[TPlatform]> => ipcRenderer.invoke("platforms:update", videoId, platform, input),
  },
};

contextBridge.exposeInMainWorld("desktop", desktopApi);
