import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BrowserRuntimeAvailability } from "./browser-runtime";
import { runAppHealthCheck } from "./health";

Object.defineProperty(globalThis, "document", {
  value: { body: { innerHTML: "" } },
  configurable: true,
});

const {
  browserCloseMock,
  chromiumLaunchMock,
  detectBrowserRuntimeMock,
} = vi.hoisted(() => ({
  detectBrowserRuntimeMock: vi.fn<() => Promise<BrowserRuntimeAvailability>>(),
  chromiumLaunchMock: vi.fn(),
  browserCloseMock: vi.fn<() => Promise<void>>(),
}));

vi.mock("./browser-runtime", () => ({
  detectBrowserRuntime: detectBrowserRuntimeMock,
}));

vi.mock("playwright", () => ({
  chromium: {
    launch: chromiumLaunchMock,
  },
}));

describe("runAppHealthCheck", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    detectBrowserRuntimeMock.mockReset();
    chromiumLaunchMock.mockReset();
    browserCloseMock.mockReset();
    browserCloseMock.mockResolvedValue(undefined);
  });

  it("marks browser runtime available when system Chrome exists", async () => {
    detectBrowserRuntimeMock.mockResolvedValue({
      available: true,
      executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      source: "system-chrome",
      message: "已检测到系统 Chrome，可用于浏览器任务。",
    });
    chromiumLaunchMock.mockResolvedValue({
      close: browserCloseMock,
    });

    const result = await runAppHealthCheck();

    expect(result.overallStatus).toBe("available");
    expect(result.browserRuntime).toEqual({
      status: "available",
      message: "已检测到系统 Chrome，可用于浏览器任务。",
    });
    expect(result.playwrightLaunch).toEqual({
      status: "available",
      message: "Playwright 浏览器启动检查通过。",
    });
    expect(chromiumLaunchMock).toHaveBeenCalledWith({
      executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      headless: true,
    });
    expect(browserCloseMock).toHaveBeenCalledTimes(1);
    expect(result.checkedAt).toEqual(expect.any(String));
  });

  it("marks launch as skipped when no runtime is available", async () => {
    detectBrowserRuntimeMock.mockResolvedValue({
      available: false,
      executablePath: null,
      source: "none",
      message: "未检测到可用的浏览器运行时。请先安装 Google Chrome，或执行 `npx playwright install chromium` 后重试。",
    });

    const result = await runAppHealthCheck();

    expect(result.overallStatus).toBe("unavailable");
    expect(result.browserRuntime).toEqual({
      status: "unavailable",
      message: "未检测到可用的浏览器运行时。请先安装 Google Chrome，或执行 `npx playwright install chromium` 后重试。",
    });
    expect(result.playwrightLaunch).toEqual({
      status: "skipped",
      message: "已跳过 Playwright 浏览器启动检查，因为未检测到可用的浏览器运行时。",
    });
    expect(chromiumLaunchMock).not.toHaveBeenCalled();
  });

  it("marks launch unavailable when Playwright launch throws", async () => {
    detectBrowserRuntimeMock.mockResolvedValue({
      available: true,
      executablePath: null,
      source: "playwright",
      message: "已检测到 Playwright Chromium 运行时。",
    });
    chromiumLaunchMock.mockRejectedValue(new Error("browserType.launch: executable doesn't exist at /tmp/chromium"));

    const result = await runAppHealthCheck();

    expect(result.overallStatus).toBe("unavailable");
    expect(result.browserRuntime).toEqual({
      status: "available",
      message: "已检测到 Playwright Chromium 运行时。",
    });
    expect(result.playwrightLaunch).toEqual({
      status: "unavailable",
      message: "Playwright 浏览器启动失败，请检查浏览器运行时是否可用。",
    });
  });
});
