import { chromium } from "playwright";
import type { AppHealthCheckResult, HealthCheckItem } from "../../shared/types/health";
import { detectBrowserRuntime } from "./browser-runtime";

const PLAYWRIGHT_LAUNCH_FAILURE_MESSAGE = "Playwright 浏览器启动失败，请检查浏览器运行时是否可用。";
const BROWSER_RUNTIME_CHECK_FAILURE_MESSAGE = "浏览器运行时检测失败，请稍后重试。";

function buildBrowserRuntimeItem(available: boolean, message: string | null): HealthCheckItem {
  return {
    status: available ? "available" : "unavailable",
    message,
  };
}

function buildLaunchMessage(): string {
  return PLAYWRIGHT_LAUNCH_FAILURE_MESSAGE;
}

export async function runAppHealthCheck(): Promise<AppHealthCheckResult> {
  const checkedAt = new Date().toISOString();

  try {
    const browserRuntime = await detectBrowserRuntime();
    const browserRuntimeResult = buildBrowserRuntimeItem(browserRuntime.available, browserRuntime.message);

    if (!browserRuntime.available) {
      return {
        overallStatus: "unavailable",
        browserRuntime: browserRuntimeResult,
        playwrightLaunch: {
          status: "skipped",
          message: "已跳过 Playwright 浏览器启动检查，因为未检测到可用的浏览器运行时。",
        },
        checkedAt,
      };
    }

    try {
      const browser = await chromium.launch(
        browserRuntime.source === "system-chrome" && browserRuntime.executablePath
          ? {
              executablePath: browserRuntime.executablePath,
              headless: true,
            }
          : {
              headless: true,
            },
      );
      await browser.close();

      return {
        overallStatus: "available",
        browserRuntime: browserRuntimeResult,
        playwrightLaunch: {
          status: "available",
          message: "Playwright 浏览器启动检查通过。",
        },
        checkedAt,
      };
    } catch (error) {
      return {
        overallStatus: "unavailable",
        browserRuntime: browserRuntimeResult,
        playwrightLaunch: {
          status: "unavailable",
          message: buildLaunchMessage(error),
        },
        checkedAt,
      };
    }
  } catch {
    return {
      overallStatus: "unavailable",
      browserRuntime: {
        status: "unavailable",
        message: BROWSER_RUNTIME_CHECK_FAILURE_MESSAGE,
      },
      playwrightLaunch: {
        status: "skipped",
        message: "已跳过 Playwright 浏览器启动检查，因为浏览器运行时检测失败。",
      },
      checkedAt,
    };
  }
}
