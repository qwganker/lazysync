import type { Locator, Page } from "playwright";
import type { BilibiliPlatformProfile } from "../../../shared/types/platforms";
import type { VideoAsset } from "../../../shared/types/video";
import { BILIBILI_LOGIN_URL_PREFIX, BILIBILI_SELECTORS, BILIBILI_UPLOAD_URL } from "./selectors";
import { ensureVideoFileExists, firstVisible, launchPersistentBrowserContext, waitForLogin } from "./common";

const FIELD_SCROLL_DELAY_MS = 300;
const FIELD_SETTLE_DELAY_MS = 700;
const FIELD_TYPE_DELAY_MS = 35;

async function ensureUploadPageReady(page: Page): Promise<Page> {
  await page.goto(BILIBILI_UPLOAD_URL, { waitUntil: "domcontentloaded" });

  while (true) {
    if (page.url().startsWith(BILIBILI_LOGIN_URL_PREFIX)) {
      const loggedInPage = await waitForLogin(page, BILIBILI_LOGIN_URL_PREFIX);
      await loggedInPage.goto(BILIBILI_UPLOAD_URL, { waitUntil: "domcontentloaded" });
      page = loggedInPage;
    }

    const uploadEntry = await firstVisible(page, [
      page.getByRole("button", { name: /上传视频/ }),
      page.getByText("上传视频", { exact: false }),
      page.locator("text=上传视频"),
    ]);

    if (uploadEntry) {
      return page;
    }

    await page.waitForTimeout(1000);
  }
}

async function revealField(page: Page, locator: Locator): Promise<void> {
  await locator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(FIELD_SCROLL_DELAY_MS);
}

async function typeIntoField(page: Page, locator: Locator, value: string): Promise<void> {
  await revealField(page, locator);
  await locator.click({ force: true });
  await locator.press("ControlOrMeta+A");
  await locator.press("Backspace");
  await locator.type(value, { delay: FIELD_TYPE_DELAY_MS });
  await page.waitForTimeout(FIELD_SETTLE_DELAY_MS);
}

async function typeIntoContentEditable(page: Page, locator: Locator, value: string): Promise<void> {
  await revealField(page, locator);
  await locator.click({ force: true });
  await locator.press("ControlOrMeta+A");
  await locator.press("Backspace");
  await locator.type(value, { delay: FIELD_TYPE_DELAY_MS });
  await page.waitForTimeout(FIELD_SETTLE_DELAY_MS);
}

async function fillSummary(page: Page, value: string): Promise<void> {
  const summaryInput = await firstVisible(page, [
    page.locator(BILIBILI_SELECTORS.summaryInput),
    page.locator(".desc-container .ql-editor"),
    page.locator(".desc-container [contenteditable='true']"),
  ]);

  if (!summaryInput) {
    throw new Error("无法定位 B 站简介输入框。");
  }

  await typeIntoContentEditable(page, summaryInput, value);
}

async function fillTags(page: Page, tags: string[]): Promise<void> {
  if (tags.length === 0) {
    return;
  }

  const tagInput = page.locator(BILIBILI_SELECTORS.tagInput).first();
  await tagInput.waitFor({ state: "visible", timeout: 30000 });
  await revealField(page, tagInput);

  const tagCloseButtons = page.locator(BILIBILI_SELECTORS.tagClose);
  while ((await tagCloseButtons.count()) > 0) {
    await tagCloseButtons.first().click({ force: true });
    await page.waitForTimeout(200);
  }

  for (const tag of tags) {
    const trimmedTag = tag.trim();
    if (!trimmedTag) {
      continue;
    }

    await revealField(page, tagInput);
    await tagInput.click({ force: true });
    await tagInput.press("ControlOrMeta+A");
    await tagInput.press("Backspace");
    await tagInput.type(trimmedTag, { delay: FIELD_TYPE_DELAY_MS });
    await tagInput.press("Enter");
    await page.waitForTimeout(FIELD_SETTLE_DELAY_MS);
  }
}

async function waitForUploadForm(page: Page): Promise<void> {
  await page.locator(BILIBILI_SELECTORS.titleInput).first().waitFor({ state: "visible", timeout: 180000 });
}

async function selectPartition(page: Page, partition: string): Promise<void> {
  const trigger = await firstVisible(page, [
    page.locator(BILIBILI_SELECTORS.partitionTrigger),
    page.locator(".video-human-type .select-container"),
  ]);

  if (!trigger) {
    throw new Error("无法定位 B 站分区选择区域。");
  }

  await revealField(page, trigger);
  await trigger.click({ force: true });
  await page.waitForTimeout(FIELD_SETTLE_DELAY_MS);
  await page.locator(BILIBILI_SELECTORS.partitionDropdown).first().waitFor({ state: "visible", timeout: 30000 });
  const option = await firstVisible(page, [
    page.locator(BILIBILI_SELECTORS.partitionDropdown).locator(BILIBILI_SELECTORS.partitionOption).filter({ hasText: partition }),
    page.locator(".video-human-type .drop-list-v2-item").filter({ hasText: partition }),
    page.locator(".video-human-type .item-cont-main").filter({ hasText: partition }),
    page.getByRole("option", { name: partition }),
  ]);

  if (!option) {
    throw new Error(`无法定位 B 站分区选项：${partition}`);
  }

  await revealField(page, option);
  await option.click({ force: true });
  await page.waitForTimeout(FIELD_SETTLE_DELAY_MS);
}

async function selectVisibility(page: Page, isPublic: boolean): Promise<void> {
  const label = isPublic ? "公开可见" : "仅自己可见";
  const moreSettings = await firstVisible(page, [
    page.locator(BILIBILI_SELECTORS.moreSettingsLabel).filter({ hasText: "更多设置" }),
    page.getByText("更多设置", { exact: false }),
  ]);

  if (!moreSettings) {
    throw new Error("无法定位“更多设置”。");
  }

  await revealField(page, moreSettings);
  await moreSettings.click({ force: true });
  await page.waitForTimeout(FIELD_SETTLE_DELAY_MS);
  const visibilityCard = await firstVisible(page, [
    page.locator(BILIBILI_SELECTORS.visibilityCard).filter({ hasText: "可见范围" }),
    page.getByText("可见范围", { exact: false }),
  ]);

  if (!visibilityCard) {
    throw new Error("无法定位“可见范围”设置。");
  }

  const option = await firstVisible(page, [
    visibilityCard.locator(BILIBILI_SELECTORS.visibilityOption).filter({ hasText: label }),
    visibilityCard.getByText(label, { exact: true }),
    page.getByText(label, { exact: true }),
  ]);

  if (!option) {
    throw new Error(`无法定位可见范围选项：${label}`);
  }

  await revealField(page, option);
  await option.click({ force: true });
  await page.waitForTimeout(FIELD_SETTLE_DELAY_MS);
}

async function submitVideo(page: Page, publishMode: BilibiliPlatformProfile["config"]["publishMode"]): Promise<void> {
  const buttonLabel = publishMode === "publish" ? "立即投稿" : "存草稿";
  const submitButton = await firstVisible(page, [
    page.locator(publishMode === "publish" ? BILIBILI_SELECTORS.publishButton : BILIBILI_SELECTORS.draftButton),
    page.getByRole("button", { name: buttonLabel }),
    page.getByText(buttonLabel, { exact: true }),
  ]);

  if (!submitButton) {
    throw new Error(`无法定位提交按钮：${buttonLabel}`);
  }

  await revealField(page, submitButton);
  await submitButton.click({ force: true });
  await page.waitForTimeout(1500);
}

async function fillMetadata(page: Page, video: VideoAsset, profile: BilibiliPlatformProfile): Promise<void> {
  const titleInput = page.locator(BILIBILI_SELECTORS.titleInput).first();
  await titleInput.waitFor({ state: "visible", timeout: 120000 });

  if (video.title.trim()) {
    await typeIntoField(page, titleInput, video.title.trim());
  }

  if (profile.config.videoType === "自制" || profile.config.videoType === "转载") {
    const videoTypeOption = await firstVisible(page, [
      page.locator(BILIBILI_SELECTORS.videoTypeOption).filter({ hasText: profile.config.videoType }),
      page.getByText(profile.config.videoType, { exact: true }),
    ]);

    if (!videoTypeOption) {
      throw new Error(`无法定位 B 站视频类型选项：${profile.config.videoType}`);
    }

    await revealField(page, videoTypeOption);
    await videoTypeOption.click({ force: true });
    await page.waitForTimeout(FIELD_SETTLE_DELAY_MS);
  }

  if (profile.config.partition?.trim()) {
    await selectPartition(page, profile.config.partition.trim());
  }

  await fillTags(page, profile.config.tags);

  if (video.summary?.trim()) {
    await fillSummary(page, video.summary.trim());
  }

  await selectVisibility(page, profile.config.visibility === "public");
  await submitVideo(page, profile.config.publishMode);
}

export async function uploadVideoToBilibili(
  video: VideoAsset,
  profile: BilibiliPlatformProfile,
): Promise<{ success: boolean; message: string }> {
  ensureVideoFileExists(video.localPath);

  const context = await launchPersistentBrowserContext("bilibili");
  const page = context.pages()[0] ?? (await context.newPage());

  try {
    const uploadPage = await ensureUploadPageReady(page);
    const uploadInput = uploadPage.locator(BILIBILI_SELECTORS.uploadInput).first();
    await uploadInput.waitFor({ state: "attached", timeout: 30000 });
    await uploadInput.setInputFiles(video.localPath);
    await waitForUploadForm(uploadPage);
    await fillMetadata(uploadPage, video, profile);

    return {
      success: true,
      message: "",
    };
  } catch (error) {
    await context.close();
    throw error;
  }
}
