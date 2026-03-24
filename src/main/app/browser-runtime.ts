import fs from "node:fs";
import path from "node:path";
import { app } from "electron";
import { chromium } from "playwright";

export interface BrowserRuntimeAvailability {
  available: boolean;
  executablePath: string | null;
  source: "system-chrome" | "playwright" | "none";
  message: string | null;
}

const NO_BROWSER_RUNTIME_MESSAGE =
  "未检测到可用的浏览器运行时。请先安装 Google Chrome，或执行 `npx playwright install chromium` 后重试。";

export function resolveSystemChromePath(): string | null {
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    path.join(app.getPath("home"), "Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function resolvePlaywrightExecutablePath(): string | null {
  try {
    const executablePath = chromium.executablePath();
    return executablePath && fs.existsSync(executablePath) ? executablePath : null;
  } catch {
    return null;
  }
}

export async function detectBrowserRuntime(): Promise<BrowserRuntimeAvailability> {
  const systemChromePath = resolveSystemChromePath();
  if (systemChromePath) {
    return {
      available: true,
      executablePath: systemChromePath,
      source: "system-chrome",
      message: "已检测到系统 Chrome，可用于浏览器任务。",
    };
  }

  const playwrightExecutablePath = resolvePlaywrightExecutablePath();
  if (playwrightExecutablePath) {
    return {
      available: true,
      executablePath: playwrightExecutablePath,
      source: "playwright",
      message: "已检测到 Playwright Chromium 运行时。",
    };
  }

  return {
    available: false,
    executablePath: null,
    source: "none",
    message: NO_BROWSER_RUNTIME_MESSAGE,
  };
}
