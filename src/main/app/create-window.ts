import path from "node:path";
import { BrowserWindow } from "electron";

const WINDOW_BACKGROUND_COLOR = "#f8fbff";
const WINDOW_OVERLAY_COLOR = "#eef4ff";
const WINDOW_SYMBOL_COLOR = "#0f172a";
const WINDOW_OVERLAY_HEIGHT = 44;

function resolvePreloadPath(): string {
  return path.resolve(__dirname, "../preload/index.js");
}

function resolveRendererEntry(): { kind: "url" | "file"; value: string } {
  const devServerUrl = process.env.SRC_VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    return { kind: "url", value: devServerUrl };
  }

  return {
    kind: "file",
    value: path.resolve(__dirname, "../../renderer/dist/index.html"),
  };
}

export async function createMainWindow(): Promise<BrowserWindow> {
  const titleBarConfig =
    process.platform === "darwin"
      ? {
          titleBarStyle: "hiddenInset" as const,
        }
      : {
          titleBarStyle: "hidden" as const,
          titleBarOverlay: {
            color: WINDOW_OVERLAY_COLOR,
            symbolColor: WINDOW_SYMBOL_COLOR,
            height: WINDOW_OVERLAY_HEIGHT,
          },
        };

  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 800,
    minHeight: 600,
    show: false,
    backgroundColor: WINDOW_BACKGROUND_COLOR,
    title: "LazySync",
    ...titleBarConfig,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: resolvePreloadPath(),
    },
  });

  const entry = resolveRendererEntry();

  window.once("ready-to-show", () => {
    window.show();
    window.focus();
  });

  if (entry.kind === "url") {
    await window.loadURL(entry.value);
  } else {
    await window.loadFile(entry.value);
  }

  return window;
}
