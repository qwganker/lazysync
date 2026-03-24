import fs from "node:fs";
import path from "node:path";
import { app } from "electron";
import { chromium, type BrowserContext, type Locator, type Page } from "playwright";
import { resolveSystemChromePath } from "../browser-runtime";

const persistentContexts = new Map<string, BrowserContext>();
const pendingPersistentContextLaunches = new Map<string, Promise<BrowserContext>>();

export function ensureVideoFileExists(localPath: string): void {
  if (!fs.existsSync(localPath)) {
    throw new Error("视频文件不存在，请重新选择本地视频后再试。");
  }
}

export function resolveSessionDir(platform: string): string {
  const sessionDir = path.join(app.getPath("userData"), "playwright", `${platform}-session`);
  fs.mkdirSync(sessionDir, { recursive: true });
  return sessionDir;
}

function rememberPersistentContext(platform: string, context: BrowserContext): BrowserContext {
  persistentContexts.set(platform, context);
  context.once("close", () => {
    if (persistentContexts.get(platform) === context) {
      persistentContexts.delete(platform);
    }
  });
  return context;
}

function isProfileInUseError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.includes("ProcessSingleton") || error.message.includes("SingletonLock");
}

export async function launchPersistentBrowserContext(platform: string): Promise<BrowserContext> {
  const existingContext = persistentContexts.get(platform);
  if (existingContext) {
    return existingContext;
  }

  const pendingLaunch = pendingPersistentContextLaunches.get(platform);
  if (pendingLaunch) {
    return pendingLaunch;
  }

  const sessionDir = resolveSessionDir(platform);
  const chromePath = resolveSystemChromePath();

  const launchPromise = (async () => {
    try {
      if (chromePath) {
        const context = await chromium.launchPersistentContext(sessionDir, {
          executablePath: chromePath,
          headless: false,
          slowMo: 80,
          args: ["--start-maximized"],
          viewport: null,
        });
        return rememberPersistentContext(platform, context);
      }

      const context = await chromium.launchPersistentContext(sessionDir, {
        headless: false,
        slowMo: 80,
        args: ["--start-maximized"],
        viewport: null,
      });
      return rememberPersistentContext(platform, context);
    } catch (error) {
      if (isProfileInUseError(error)) {
        throw new Error("浏览器会话目录已被占用。请先关闭该平台已打开的上传浏览器窗口后重试。");
      }

      if (!chromePath) {
        throw new Error("未检测到可用的浏览器运行时。请先安装 Google Chrome，或执行 `npx playwright install chromium` 后重试。");
      }

      throw error instanceof Error ? error : new Error("启动浏览器失败。");
    } finally {
      pendingPersistentContextLaunches.delete(platform);
    }
  })();

  pendingPersistentContextLaunches.set(platform, launchPromise);
  return launchPromise;
}

export async function firstVisible(page: Page, locators: Locator[]): Promise<Locator | null> {
  for (const locator of locators) {
    try {
      if ((await locator.count()) > 0) {
        const candidate = locator.first();
        if (await candidate.isVisible()) {
          return candidate;
        }
      }
    } catch {
      continue;
    }
  }

  return null;
}

export async function waitForLogin(page: Page, loginUrlPrefix: string): Promise<Page> {
  const deadline = Date.now() + 10 * 60 * 1000;

  while (Date.now() < deadline) {
    for (const candidate of page.context().pages()) {
      const url = candidate.url();
      if (url && !url.startsWith(loginUrlPrefix)) {
        return candidate;
      }
    }

    if (!page.url().startsWith(loginUrlPrefix)) {
      return page;
    }

    await page.waitForTimeout(1000);
  }

  throw new Error("等待登录超时，请完成登录后重试。");
}
