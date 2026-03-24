export const BILIBILI_UPLOAD_URL = "https://member.bilibili.com/platform/upload/video/frame";
export const BILIBILI_LOGIN_URL_PREFIX = "https://passport.bilibili.com/login";

export const BILIBILI_SELECTORS = {
  uploadInput: "input[type='file']",
  titleInput: "input[placeholder*='标题']",
  summaryInput: ".desc-container .ql-editor[contenteditable='true'], .desc-container div[contenteditable='true']",
  videoTypeOption: ".type-check-radio-wrp .check-radio-v2-container",
  partitionTrigger: ".video-human-type .select-controller",
  partitionDropdown: ".video-human-type .drop-list-v2-container",
  tagInput: "#tag-container input[placeholder*='按回车键Enter创建标签']",
  tagItem: "#tag-container .label-item-v2-container",
  tagClose: "#tag-container .label-item-v2-container .close",
  moreSettingsLabel: "span.label",
  visibilityCard: ".setting-card.video-setting-card",
  visibilityOption: ".check-radio-v2-container",
  partitionOption: ".drop-list-v2-item, .drop-list-v2-item-cont, .item-cont-main, .select-item, .option-item, [role='option']",
  draftButton: "button:has-text('存草稿')",
  publishButton: "button:has-text('立即投稿')",
} as const;

export const XIAOHONGSHU_PUBLISH_URL = "https://creator.xiaohongshu.com/publish/publish";
export const XIAOHONGSHU_LOGIN_URL_PREFIX = "https://creator.xiaohongshu.com/login";

export const XIAOHONGSHU_SELECTORS = {
  uploadInput: "input[type='file'][accept*='video'], input[type='file'][accept*='mp4'], input[type='file']",
  titleInput: "input[placeholder*='标题'], textarea[placeholder*='标题']",
  descriptionInput:
    "textarea[placeholder*='描述'], textarea[placeholder*='简介'], div[contenteditable='true'][data-placeholder*='描述'], div[contenteditable='true'][data-placeholder*='简介'], [role='textbox'][contenteditable='true']",
  visibilitySelect: ".permission-card-select",
  dropdownContainer: ".d-popover, .d-dropdown-content, .d-options-wrapper",
  draftButton: "button:has-text('暂存离开')",
  publishButton: "button:has-text('发布')",
} as const;
