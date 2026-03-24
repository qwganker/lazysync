import { app, BrowserWindow, dialog, ipcMain, shell, type IpcMainInvokeEvent } from "electron";
import path from "node:path";
import type { PlatformProfileMap, VideoPlatform } from "../shared/types/platforms";
import type { CreateVideoAssetInput, ListVideosInput, UpdateVideoAssetInput } from "../shared/types/video";
import {
  createVideo,
  deleteVideo,
  ensurePlatformProfile,
  getPlatformProfile,
  getVideoAssetById,
  initializeDatabase,
  listVideoDetails,
  updatePlatformProfile,
  updateVideoAsset,
} from "./app/database";
import { runAppHealthCheck } from "./app/health";
import { getPlatformLabel, uploadVideoToPlatform } from "./app/upload";
import { registerAppLifecycle } from "./app/lifecycle";
import { createMainWindow } from "./app/create-window";

app.setName("LazySync");

let mainWindow: BrowserWindow | null = null;

registerAppLifecycle({
  createWindow: async () => {
    mainWindow = await createMainWindow();
    return mainWindow;
  },
  hasOpenWindows: () => BrowserWindow.getAllWindows().length > 0,
  focusExistingWindow: () => {
    mainWindow?.focus();
  },
  beforeReady: async () => {
    initializeDatabase(path.dirname(app.getAppPath()));

    ipcMain.handle("system:pick-video-file", async () => {
      const result = await dialog.showOpenDialog({
        title: "选择本地视频文件",
        properties: ["openFile"],
        filters: [
          {
            name: "视频文件",
            extensions: ["mp4", "mov", "m4v", "avi", "mkv", "wmv", "flv", "webm"],
          },
        ],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      return result.filePaths[0];
    });
    ipcMain.handle("system:open-path", async (_event, targetPath: string) => {
      const error = await shell.openPath(targetPath);
      return {
        success: error.length === 0,
        error: error || null,
      };
    });
    ipcMain.handle("system:health-check", async () => runAppHealthCheck());

    ipcMain.handle("videos:list", async (_event, input: ListVideosInput) => listVideoDetails(input));
    ipcMain.handle("videos:create", async (_event, input: CreateVideoAssetInput) => createVideo(input));
    ipcMain.handle("videos:update-asset", async (_event, videoId: string, input: UpdateVideoAssetInput) =>
      updateVideoAsset(videoId, input),
    );
    ipcMain.handle("videos:delete", async (_event, videoId: string) => deleteVideo(videoId));
    ipcMain.handle("platforms:get", async (_event, videoId: string, platform: VideoPlatform) =>
      getPlatformProfile(videoId, platform),
    );
    ipcMain.handle(
      "platforms:update",
      async <TPlatform extends VideoPlatform>(
        _event: IpcMainInvokeEvent,
        videoId: string,
        platform: TPlatform,
        input: PlatformProfileMap[TPlatform]["config"],
      ) => updatePlatformProfile(videoId, platform, input),
    );
    ipcMain.handle("videos:upload", async (_event, videoId: string, platform: VideoPlatform) => {
      try {
        const video = getVideoAssetById(videoId);
        if (!video) {
          throw new Error("视频不存在，请刷新列表后重试。");
        }

        if (!video.localPath) {
          throw new Error("视频缺少本地文件路径，无法上传。");
        }

        const profile = ensurePlatformProfile(videoId, platform);
        return uploadVideoToPlatform(platform, video, profile);
      } catch (error) {
        const message = error instanceof Error ? error.message : "未知错误。";
        throw new Error(`${getPlatformLabel(platform)}上传失败：${message}`);
      }
    });
  },
});
