import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HomeView from "./HomeView.vue";
import type { RendererAppHealthCheckResult } from "../../types/health";

type DesktopSystemApi = Window["desktop"]["system"];

function createHealthResult(overrides: Partial<RendererAppHealthCheckResult> = {}): RendererAppHealthCheckResult {
  return {
    overallStatus: "available",
    browserRuntime: {
      status: "available",
      message: "已检测到系统 Chrome，可用于浏览器任务。",
    },
    playwrightLaunch: {
      status: "available",
      message: "Playwright 浏览器启动检查通过。",
    },
    checkedAt: "2026-03-24T09:00:00.000Z",
    ...overrides,
  };
}

describe("HomeView", () => {
  const checkHealthMock = vi.fn<DesktopSystemApi["checkHealth"]>();

  beforeEach(() => {
    checkHealthMock.mockReset();
    Object.defineProperty(window, "desktop", {
      configurable: true,
      value: {
        system: {
          checkHealth: checkHealthMock,
        },
      },
    });
  });

  afterEach(() => {
    delete (window as Partial<Window>).desktop;
  });

  it("runs a health check on mount", async () => {
    checkHealthMock.mockResolvedValue(createHealthResult());

    const wrapper = mount(HomeView);
    expect(wrapper.text()).toContain("等待检测完成");
    await flushPromises();

    expect(checkHealthMock).toHaveBeenCalledTimes(1);
  });

  it("uses the same card container styling hooks for overview and detail sections", async () => {
    checkHealthMock.mockResolvedValue(createHealthResult());

    const wrapper = mount(HomeView);
    await flushPromises();

    expect(wrapper.findAll(".status-card")).toHaveLength(3);
    expect(wrapper.findAll(".health-card__footer")).toHaveLength(1);
  });

  it("renders unavailable runtime summary", async () => {
    checkHealthMock.mockResolvedValue(
      createHealthResult({
        overallStatus: "unavailable",
        browserRuntime: {
          status: "unavailable",
          message: "未检测到可用的浏览器运行时。",
        },
        playwrightLaunch: {
          status: "skipped",
          message: "已跳过 Playwright 浏览器启动检查，因为未检测到可用的浏览器运行时。",
        },
      }),
    );

    const wrapper = mount(HomeView);
    await flushPromises();

    expect(wrapper.text()).not.toContain("环境可用");
    expect(wrapper.text()).not.toContain("环境不可用");
    expect(wrapper.text()).not.toContain("检测时间：");
    expect(wrapper.text()).not.toContain("最近检测时间：");
    expect(wrapper.text()).toContain("未检测到可用的浏览器运行时。");
  });

  it("shows skipped launch status when runtime check fails", async () => {
    checkHealthMock.mockResolvedValue(
      createHealthResult({
        overallStatus: "unavailable",
        browserRuntime: {
          status: "unavailable",
          message: "未检测到可用的浏览器运行时。",
        },
        playwrightLaunch: {
          status: "skipped",
          message: "已跳过 Playwright 浏览器启动检查，因为未检测到可用的浏览器运行时。",
        },
      }),
    );

    const wrapper = mount(HomeView);
    await flushPromises();

    expect(wrapper.text()).toContain("已跳过");
    expect(wrapper.text()).toContain("已跳过 Playwright 浏览器启动检查，因为未检测到可用的浏览器运行时。");
  });

  it("retries without clearing the previous result immediately", async () => {
    let resolveSecondRequest!: (value: RendererAppHealthCheckResult) => void;

    checkHealthMock
      .mockResolvedValueOnce(
        createHealthResult({
          overallStatus: "unavailable",
          browserRuntime: {
            status: "unavailable",
            message: "首次检测失败。",
          },
          playwrightLaunch: {
            status: "skipped",
            message: "首次检测跳过。",
          },
        }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<RendererAppHealthCheckResult>((resolve) => {
            resolveSecondRequest = resolve;
          }),
      );

    const wrapper = mount(HomeView);
    await flushPromises();

    expect(wrapper.text()).toContain("首次检测失败。");

    await wrapper.get("[data-testid='retry-health-check']").trigger("click");
    await flushPromises();

    expect(checkHealthMock).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain("首次检测失败。");

    expect(resolveSecondRequest).toBeTypeOf("function");
    resolveSecondRequest(
      createHealthResult({
        overallStatus: "available",
        browserRuntime: {
          status: "available",
          message: "再次检测成功。",
        },
        playwrightLaunch: {
          status: "available",
          message: "浏览器启动检查通过。",
        },
      }),
    );
    await flushPromises();

    expect(wrapper.text()).toContain("再次检测成功。");
    expect(wrapper.text()).not.toContain("首次检测失败。");
  });
});
