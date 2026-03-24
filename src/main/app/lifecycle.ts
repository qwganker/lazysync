import { app } from "electron";

interface RegisterAppLifecycleOptions {
  beforeReady?: () => Promise<void> | void;
  createWindow: () => Promise<unknown>;
  hasOpenWindows: () => boolean;
  focusExistingWindow: () => void;
}

export function registerAppLifecycle(options: RegisterAppLifecycleOptions): void {
  app.whenReady().then(async () => {
    await options.beforeReady?.();
    await options.createWindow();

    app.on("activate", async () => {
      if (options.hasOpenWindows()) {
        options.focusExistingWindow();
        return;
      }
      await options.createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}
