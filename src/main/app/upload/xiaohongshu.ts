import type { Locator, Page } from "playwright";
import type { XiaohongshuPlatformProfile, XiaohongshuVisibility } from "../../../shared/types/platforms";
import type { VideoAsset } from "../../../shared/types/video";
import {
  XIAOHONGSHU_LOGIN_URL_PREFIX,
  XIAOHONGSHU_PUBLISH_URL,
  XIAOHONGSHU_SELECTORS,
} from "./selectors";
import { ensureVideoFileExists, firstVisible, launchPersistentBrowserContext, waitForLogin } from "./common";

const XIAOHONGSHU_VISIBILITY_LABELS: Record<XiaohongshuVisibility, string> = {
  public: "公开可见",
  private: "仅自己可见",
  followers_only: "仅互关好友可见",
};

async function fillInput(locator: Locator, value: string): Promise<void> {
  await locator.click({ force: true });
  await locator.press("ControlOrMeta+A");
  await locator.fill(value);
}

async function clickDropdownOption(page: Page, label: string): Promise<void> {
  const option = await firstVisible(page, [
    page.locator(XIAOHONGSHU_SELECTORS.dropdownContainer).getByText(label, { exact: true }),
    page.getByText(label, { exact: true }),
  ]);

  if (!option) {
    throw new Error(`无法定位小红书选项：${label}`);
  }

  await option.click({ force: true });
}

async function fillDescription(page: Page, value: string): Promise<void> {
  const descriptionInput = await firstVisible(page, [
    page.locator(XIAOHONGSHU_SELECTORS.descriptionInput),
    page.getByPlaceholder("添加正文描述"),
    page.getByPlaceholder("填写笔记描述"),
  ]);

  if (!descriptionInput) {
    return;
  }

  try {
    await descriptionInput.fill(value);
    return;
  } catch {
    await descriptionInput.click({ force: true });
    await descriptionInput.press("ControlOrMeta+A");
    await descriptionInput.evaluate("(node, text) => { node.textContent = text; }", value);
  }
}

async function waitForPublishPageReady(page: Page): Promise<Page> {
  await page.goto(XIAOHONGSHU_PUBLISH_URL, { waitUntil: "domcontentloaded" });

  while (true) {
    if (page.url().startsWith(XIAOHONGSHU_LOGIN_URL_PREFIX)) {
      const loggedInPage = await waitForLogin(page, XIAOHONGSHU_LOGIN_URL_PREFIX);
      await loggedInPage.goto(XIAOHONGSHU_PUBLISH_URL, { waitUntil: "domcontentloaded" });
      page = loggedInPage;
    }

    const publishEntry = await firstVisible(page, [
      page.locator(XIAOHONGSHU_SELECTORS.uploadInput),
      page.getByText("上传视频", { exact: false }),
      page.getByText("拖拽", { exact: false }),
    ]);

    if (publishEntry) {
      return page;
    }

    await page.waitForTimeout(1000);
  }
}

async function waitForUploadForm(page: Page): Promise<void> {
  const titleInput = await firstVisible(page, [
    page.locator(XIAOHONGSHU_SELECTORS.titleInput),
    page.getByPlaceholder("填写标题会有更多赞哦"),
    page.getByPlaceholder("请输入标题"),
  ]);

  if (!titleInput) {
    throw new Error("无法定位小红书标题输入框。");
  }

  await titleInput.waitFor({ state: "visible", timeout: 300000 });
}

async function waitForSubmitButton(
  page: Page,
  submitMode: XiaohongshuPlatformProfile["config"]["submitMode"],
): Promise<Locator> {
  const buttonLabel = submitMode === "draft" ? "暂存离开" : "发布";
  const deadline = Date.now() + 5 * 60 * 1000;

  while (Date.now() < deadline) {
    const submitButton = await firstVisible(page, [
      page.locator(submitMode === "draft" ? XIAOHONGSHU_SELECTORS.draftButton : XIAOHONGSHU_SELECTORS.publishButton),
      page.getByRole("button", { name: buttonLabel }),
      page.getByText(buttonLabel, { exact: true }),
    ]);

    if (submitButton && (await submitButton.isEnabled())) {
      return submitButton;
    }

    await page.waitForTimeout(1000);
  }

  throw new Error(`等待小红书“${buttonLabel}”按钮可用超时，请确认视频已完成上传处理。`);
}

async function setVisibility(page: Page, visibility: XiaohongshuVisibility): Promise<void> {
  const label = XIAOHONGSHU_VISIBILITY_LABELS[visibility];
  const visibilitySelect = await firstVisible(page, [
    page.locator(XIAOHONGSHU_SELECTORS.visibilitySelect),
    page.locator(".permission-card-select"),
  ]);

  if (!visibilitySelect) {
    throw new Error("无法定位小红书可见范围设置。");
  }

  if ((await visibilitySelect.textContent())?.includes(label)) {
    return;
  }

  await visibilitySelect.click({ force: true });
  await clickDropdownOption(page, label);
}

async function fillMetadata(page: Page, video: VideoAsset, profile: XiaohongshuPlatformProfile): Promise<void> {
  const titleInput = await firstVisible(page, [
    page.locator(XIAOHONGSHU_SELECTORS.titleInput),
    page.getByPlaceholder("填写标题会有更多赞哦"),
    page.getByPlaceholder("请输入标题"),
  ]);

  if (!titleInput) {
    throw new Error("无法定位小红书标题输入框。");
  }

  if (video.title.trim()) {
    await fillInput(titleInput, video.title.trim());
  }

  if (video.summary?.trim()) {
    await fillDescription(page, video.summary.trim());
  }

  await setVisibility(page, profile.config.visibility);
}

export async function uploadVideoToXiaohongshu(
  video: VideoAsset,
  profile: XiaohongshuPlatformProfile,
): Promise<{ success: boolean; message: string }> {
  ensureVideoFileExists(video.localPath);

  const context = await launchPersistentBrowserContext("xiaohongshu");
  const page = context.pages()[0] ?? (await context.newPage());

  try {
    const publishPage = await waitForPublishPageReady(page);
    const uploadInput = publishPage.locator(XIAOHONGSHU_SELECTORS.uploadInput).first();
    await uploadInput.waitFor({ state: "attached", timeout: 30000 });
    await uploadInput.setInputFiles(video.localPath);
    await waitForUploadForm(publishPage);
    await fillMetadata(publishPage, video, profile);
    const submitButton = await waitForSubmitButton(publishPage, profile.config.submitMode);
    await submitButton.click({ force: true });
    await publishPage.waitForTimeout(1500);

    return {
      success: true,
      message: "",
    };
  } catch (error) {
    await context.close();
    throw error;
  }
}
