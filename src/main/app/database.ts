import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";
import type {
  BilibiliPlatformProfile,
  BilibiliProfileConfig,
  BilibiliVideoType,
  PlatformProfileMap,
  VideoPlatform,
  VideoPlatformProfile,
  XiaohongshuProfileConfig,
  XiaohongshuVisibility,
} from "../../shared/types/platforms";
import type {
  CreateVideoAssetInput,
  ListVideosInput,
  PaginatedVideoDetails,
  UpdateVideoAssetInput,
  VideoAsset,
  VideoDetail,
} from "../../shared/types/video";

export interface VideoPlatformProfileRecord {
  id: string;
  videoId: string;
  platform: VideoPlatform;
  enabled: boolean;
  configJson: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateVideoInput = CreateVideoAssetInput;
export type VideoAssetRecord = VideoAsset;
export type VideoDetailRecord = VideoDetail;
export type PaginatedVideoDetailRecord = PaginatedVideoDetails;

const LEGACY_BILIBILI_VIDEO_COLUMNS = ["publish_mode", "bilibili_video_type", "bilibili_partition", "bilibili_is_public"] as const;

const CREATE_VIDEOS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS videos (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL DEFAULT 'video',
    title TEXT NOT NULL,
    summary TEXT,
    local_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    format TEXT,
    size INTEGER,
    selected_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;

const CREATE_VIDEO_PLATFORM_PROFILES_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS video_platform_profiles (
    id TEXT PRIMARY KEY,
    video_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    config_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
  );
`;

const CREATE_SELECTED_AT_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS idx_videos_selected_at ON videos(selected_at DESC);
`;

const CREATE_UPDATED_AT_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS idx_videos_updated_at ON videos(updated_at DESC);
`;

const CREATE_VIDEO_PLATFORM_PROFILES_UNIQUE_INDEX_SQL = `
  CREATE UNIQUE INDEX IF NOT EXISTS idx_video_platform_profiles_unique
  ON video_platform_profiles(video_id, platform);
`;

const CREATE_VIDEO_PLATFORM_PROFILES_VIDEO_ID_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS idx_video_platform_profiles_video_id
  ON video_platform_profiles(video_id);
`;

let database: Database.Database | null = null;
const DATABASE_FILE_NAME = "lazysync.sqlite3";
const LEGACY_DATABASE_FILE_NAME = "lazysync-next.sqlite3";

function resolveDatabasePath(userDataPath: string): string {
  return path.join(userDataPath, DATABASE_FILE_NAME);
}

function migrateLegacyDatabaseFile(userDataPath: string): void {
  const databasePath = resolveDatabasePath(userDataPath);
  const legacyDatabasePath = path.join(userDataPath, LEGACY_DATABASE_FILE_NAME);

  if (fs.existsSync(databasePath) || !fs.existsSync(legacyDatabasePath)) {
    return;
  }

  fs.renameSync(legacyDatabasePath, databasePath);
}

function safeParseJson(value: unknown): unknown {
  if (typeof value !== "string") {
    return {};
  }

  if (value.trim().length === 0) {
    return {};
  }

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function mapVideoAssetRow(row: Record<string, unknown>): VideoAssetRecord {
  return {
    id: String(row.id),
    title: String(row.title),
    summary: row.summary === null ? null : String(row.summary),
    localPath: String(row.local_path),
    fileName: String(row.file_name),
    format: row.format === null ? null : String(row.format),
    size: typeof row.size === "number" ? row.size : null,
    selectedAt: row.selected_at === null ? null : String(row.selected_at),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapVideoPlatformProfileRow(row: Record<string, unknown>): VideoPlatformProfileRecord {
  return {
    id: String(row.id),
    videoId: String(row.video_id),
    platform: String(row.platform) as VideoPlatform,
    enabled: Number(row.enabled) === 1,
    configJson: typeof row.config_json === "string" ? row.config_json : "{}",
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function parseBilibiliProfileConfig(configJson: string): BilibiliProfileConfig {
  const parsed = safeParseJson(configJson) as Partial<BilibiliProfileConfig>;
  const tags = Array.isArray(parsed.tags) ? parsed.tags.filter((value): value is string => typeof value === "string").map((value) => value.trim()).filter(Boolean) : [];

  return {
    publishMode: parsed.publishMode === "publish" ? "publish" : "draft",
    videoType: parsed.videoType === "自制" || parsed.videoType === "转载" ? parsed.videoType : null,
    partition: typeof parsed.partition === "string" ? parsed.partition : null,
    visibility: parsed.visibility === "public" ? "public" : "private",
    tags,
  };
}

function parseXiaohongshuProfileConfig(configJson: string): XiaohongshuProfileConfig {
  const parsed = safeParseJson(configJson) as Partial<XiaohongshuProfileConfig>;
  const visibility: XiaohongshuVisibility =
    parsed.visibility === "public" || parsed.visibility === "followers_only" ? parsed.visibility : "private";

  return {
    visibility,
    submitMode: parsed.submitMode === "publish" ? "publish" : "draft",
  };
}

function parseLegacyBilibiliVideoType(value: unknown): BilibiliVideoType | null {
  return value === "自制" || value === "转载" ? value : null;
}

function parsePlatformProfile<TPlatform extends VideoPlatform>(record: VideoPlatformProfileRecord): PlatformProfileMap[TPlatform] {
  return mapPlatformProfile(record.videoId, record, record.platform as TPlatform);
}

function groupPlatformProfilesByVideoId(records: VideoPlatformProfileRecord[]): Map<string, VideoPlatformProfileRecord[]> {
  const groupedProfiles = new Map<string, VideoPlatformProfileRecord[]>();

  for (const record of records) {
    const profiles = groupedProfiles.get(record.videoId) ?? [];
    profiles.push(record);
    groupedProfiles.set(record.videoId, profiles);
  }

  return groupedProfiles;
}

function toVideoDetail(asset: VideoAssetRecord, profileRecords: VideoPlatformProfileRecord[]): VideoDetailRecord {
  return {
    asset,
    platformProfiles: profileRecords.map((record) => parsePlatformProfile(record)),
  };
}

function deriveTitle(fileName: string): string {
  const extension = path.extname(fileName);
  const baseName = path.basename(fileName, extension).trim();
  return baseName.length > 0 ? baseName : fileName;
}

function getBilibiliPlatformProfileConfig(video: VideoDetailRecord): BilibiliProfileConfig {
  const bilibiliProfile = video.platformProfiles.find((profile) => profile.platform === "bilibili");

  if (bilibiliProfile && bilibiliProfile.platform === "bilibili") {
    return bilibiliProfile.config;
  }

  return {
    publishMode: "draft",
    videoType: null,
    partition: null,
    visibility: "private",
    tags: [],
  };
}

function getDefaultPlatformConfig<TPlatform extends VideoPlatform>(platform: TPlatform): PlatformProfileMap[TPlatform]["config"] {
  switch (platform) {
    case "bilibili":
      return {
        publishMode: "draft",
        videoType: null,
        partition: null,
        visibility: "private",
        tags: [],
      } as PlatformProfileMap[TPlatform]["config"];
    case "xiaohongshu":
      return {
        visibility: "private",
        submitMode: "draft",
      } as PlatformProfileMap[TPlatform]["config"];
    default:
      throw new Error(`Unsupported platform: ${String(platform)}`);
  }
}

function toBilibiliPlatformProfile(video: VideoDetailRecord, record?: VideoPlatformProfileRecord | null): BilibiliPlatformProfile {
  const config = getBilibiliPlatformProfileConfig(video);

  return {
    id: record?.id ?? randomUUID(),
    videoId: video.asset.id,
    platform: "bilibili",
    enabled: record?.enabled ?? true,
      config: {
        publishMode: config.publishMode,
        videoType: config.videoType,
        partition: config.partition,
        visibility: config.visibility,
        tags: config.tags,
      },
    createdAt: record?.createdAt ?? video.asset.createdAt,
    updatedAt: record?.updatedAt ?? video.asset.updatedAt,
  };
}

function serializePlatformProfile(profile: VideoPlatformProfile): string {
  return JSON.stringify(profile.config);
}

function getVideoTableColumnNames(): string[] {
  const rows = getDatabase().prepare("PRAGMA table_info(videos)").all() as Array<{ name?: unknown }>;
  return rows.map((row) => String(row.name));
}

function getLegacyBilibiliColumnSelectList(): string {
  const columnNames = new Set(getVideoTableColumnNames());

  return [
    "id",
    "title",
    "summary",
    "local_path",
    "file_name",
    "format",
    "size",
    "selected_at",
    columnNames.has("publish_mode") ? "publish_mode" : "'draft' AS publish_mode",
    columnNames.has("bilibili_video_type") ? "bilibili_video_type" : "NULL AS bilibili_video_type",
    columnNames.has("bilibili_partition") ? "bilibili_partition" : "NULL AS bilibili_partition",
    columnNames.has("bilibili_is_public") ? "bilibili_is_public" : "0 AS bilibili_is_public",
    "created_at",
    "updated_at",
  ].join(",\n          ");
}

function normalizeListVideosInput(input: ListVideosInput): ListVideosInput {
  return {
    page: Number.isInteger(input.page) && input.page > 0 ? input.page : 1,
    pageSize: Number.isInteger(input.pageSize) && input.pageSize > 0 ? input.pageSize : 8,
  };
}

function countVideoAssets(): number {
  const row = getDatabase()
    .prepare(
      `
        SELECT COUNT(*) AS total
        FROM videos
      `,
    )
    .get() as Record<string, unknown> | undefined;

  return typeof row?.total === "number" ? row.total : Number(row?.total ?? 0);
}

function listVideoAssetRows(input: ListVideosInput): VideoAssetRecord[] {
  const { page, pageSize } = normalizeListVideosInput(input);
  const offset = (page - 1) * pageSize;
  const rows = getDatabase()
    .prepare(
      `
        SELECT
          id,
          title,
          summary,
          local_path,
          file_name,
          format,
          size,
          selected_at,
          created_at,
          updated_at
        FROM videos
        ORDER BY COALESCE(selected_at, updated_at, created_at) DESC, created_at DESC
        LIMIT ? OFFSET ?
      `,
    )
    .all(pageSize, offset) as Array<Record<string, unknown>>;

  return rows.map((row) => mapVideoAssetRow(row));
}

function getVideoAssetRow(videoId: string): VideoAssetRecord | null {
  const row = getDatabase()
    .prepare(
      `
        SELECT
          id,
          title,
          summary,
          local_path,
          file_name,
          format,
          size,
          selected_at,
          created_at,
          updated_at
        FROM videos
        WHERE id = ?
      `,
    )
    .get(videoId) as Record<string, unknown> | undefined;

  return row ? mapVideoAssetRow(row) : null;
}

function listPlatformProfileRecords(videoIds: string[]): VideoPlatformProfileRecord[] {
  if (videoIds.length === 0) {
    return [];
  }

  const placeholders = videoIds.map(() => "?").join(", ");
  const rows = getDatabase()
    .prepare(
      `
        SELECT
          id,
          video_id,
          platform,
          enabled,
          config_json,
          created_at,
          updated_at
        FROM video_platform_profiles
        WHERE video_id IN (${placeholders})
        ORDER BY created_at ASC, id ASC
      `,
    )
    .all(...videoIds) as Array<Record<string, unknown>>;

  return rows.map((row) => mapVideoPlatformProfileRow(row));
}
function getPlatformProfileRecord<TPlatform extends VideoPlatform>(
  videoId: string,
  platform: TPlatform,
): VideoPlatformProfileRecord | null {
  const row = getDatabase()
    .prepare(
      `
        SELECT
          id,
          video_id,
          platform,
          enabled,
          config_json,
          created_at,
          updated_at
        FROM video_platform_profiles
        WHERE video_id = ? AND platform = ?
      `,
    )
    .get(videoId, platform) as Record<string, unknown> | undefined;

  return row ? mapVideoPlatformProfileRow(row) : null;
}


function mapPlatformProfile<TPlatform extends VideoPlatform>(
  videoId: string,
  record: VideoPlatformProfileRecord,
  platform: TPlatform,
): PlatformProfileMap[TPlatform] {
  switch (platform) {
    case "bilibili":
      return {
        id: record.id,
        videoId,
        platform: "bilibili",
        enabled: record.enabled,
        config: parseBilibiliProfileConfig(record.configJson),
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      } as PlatformProfileMap[TPlatform];
    case "xiaohongshu":
      return {
        id: record.id,
        videoId,
        platform: "xiaohongshu",
        enabled: record.enabled,
        config: parseXiaohongshuProfileConfig(record.configJson),
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      } as PlatformProfileMap[TPlatform];
    default:
      throw new Error(`Unsupported platform: ${String(platform)}`);
  }
}

function upsertPlatformProfile<TPlatform extends VideoPlatform>(
  videoId: string,
  platform: TPlatform,
  config: PlatformProfileMap[TPlatform]["config"],
  updatedAt: string,
): void {
  const video = getVideoDetailById(videoId);
  if (!video) {
    throw new Error("Video not found.");
  }

  const existingProfile = getPlatformProfileRecord(videoId, platform);

  const profile = {
    id: existingProfile?.id ?? randomUUID(),
    videoId,
    platform,
    enabled: existingProfile?.enabled ?? true,
    config: config ?? getDefaultPlatformConfig(platform),
    createdAt: existingProfile?.createdAt ?? video.asset.createdAt,
    updatedAt,
  } as PlatformProfileMap[TPlatform];

  getDatabase().prepare(
    `
      INSERT INTO video_platform_profiles (
        id,
        video_id,
        platform,
        enabled,
        config_json,
        created_at,
        updated_at
      ) VALUES (
        @id,
        @videoId,
        @platform,
        @enabled,
        @configJson,
        @createdAt,
        @updatedAt
      )
      ON CONFLICT(video_id, platform) DO UPDATE SET
        enabled = excluded.enabled,
        config_json = excluded.config_json,
        updated_at = excluded.updated_at
    `,
  ).run({
    id: profile.id,
    videoId: profile.videoId,
    platform: profile.platform,
    enabled: profile.enabled ? 1 : 0,
    configJson: serializePlatformProfile(profile),
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  });
}

function touchVideoUpdatedAt(videoId: string, updatedAt: string): void {
  getDatabase().prepare("UPDATE videos SET updated_at = ? WHERE id = ?").run(updatedAt, videoId);
}

function dropLegacyBilibiliColumns(): void {
  const columnNames = new Set(getVideoTableColumnNames());

  for (const columnName of LEGACY_BILIBILI_VIDEO_COLUMNS) {
    if (!columnNames.has(columnName)) {
      continue;
    }

    getDatabase().exec(`ALTER TABLE videos DROP COLUMN ${columnName}`);
  }
}

function migrateLegacyBilibiliProfiles(): void {
  const rows = getDatabase()
    .prepare(
      `
        SELECT
          ${getLegacyBilibiliColumnSelectList()}
        FROM videos
      `,
    )
    .all() as Array<Record<string, unknown>>;

  for (const row of rows) {
    const video = {
      asset: mapVideoAssetRow(row),
      platformProfiles: [
        {
          id: randomUUID(),
          videoId: String(row.id),
          platform: "bilibili" as const,
          enabled: true,
          config: {
            publishMode: row.publish_mode === "publish" ? "publish" : "draft",
            videoType: parseLegacyBilibiliVideoType(row.bilibili_video_type),
            partition: row.bilibili_partition === null ? null : String(row.bilibili_partition),
            visibility: Number(row.bilibili_is_public) === 1 ? "public" : "private",
            tags: [],
          },
          createdAt: String(row.created_at),
          updatedAt: String(row.updated_at),
        },
      ],
    } satisfies VideoDetailRecord;

    if (getPlatformProfileRecord(video.asset.id, "bilibili")) {
      continue;
    }

    const profile = toBilibiliPlatformProfile(video);
    getDatabase().prepare(
      `
        INSERT INTO video_platform_profiles (
          id,
          video_id,
          platform,
          enabled,
          config_json,
          created_at,
          updated_at
        ) VALUES (
          @id,
          @videoId,
          @platform,
          @enabled,
          @configJson,
          @createdAt,
          @updatedAt
        )
      `,
    ).run({
      id: profile.id,
      videoId: profile.videoId,
      platform: profile.platform,
      enabled: profile.enabled ? 1 : 0,
      configJson: serializePlatformProfile(profile),
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    });
  }

  dropLegacyBilibiliColumns();
}

export function getVideoAssetById(videoId: string): VideoAssetRecord | null {
  return getVideoAssetRow(videoId);
}

export function getPlatformProfile<TPlatform extends VideoPlatform>(
  videoId: string,
  platform: TPlatform,
): PlatformProfileMap[TPlatform] | null {
  if (!getVideoAssetById(videoId)) {
    return null;
  }

  const record = getPlatformProfileRecord(videoId, platform);
  if (!record) {
    return null;
  }

  return mapPlatformProfile(videoId, record, platform);
}

export function updateVideoAsset(videoId: string, input: UpdateVideoAssetInput): VideoDetailRecord {
  const existingVideo = getVideoDetailById(videoId);
  if (!existingVideo) {
    throw new Error("Video not found.");
  }

  const updatedAt = new Date().toISOString();

  getDatabase().prepare(
    `
      UPDATE videos
      SET
        title = @title,
        summary = @summary,
        updated_at = @updatedAt
      WHERE id = @id
    `,
  ).run({
    id: videoId,
    title: input.title,
    summary: input.summary,
    updatedAt,
  });

  const updatedVideo = getVideoDetailById(videoId);
  if (!updatedVideo) {
    throw new Error("Video not found after update.");
  }

  return updatedVideo;
}

export function updatePlatformProfile<TPlatform extends VideoPlatform>(
  videoId: string,
  platform: TPlatform,
  config: PlatformProfileMap[TPlatform]["config"],
): PlatformProfileMap[TPlatform] {
  const video = getVideoDetailById(videoId);
  if (!video) {
    throw new Error("Video not found.");
  }

  const updatedAt = new Date().toISOString();
  touchVideoUpdatedAt(videoId, updatedAt);
  upsertPlatformProfile(videoId, platform, config, updatedAt);

  const profile = getPlatformProfile(videoId, platform);
  if (!profile) {
    throw new Error(`${platform} profile not found after update.`);
  }

  return profile;
}

export function ensurePlatformProfile<TPlatform extends VideoPlatform>(
  videoId: string,
  platform: TPlatform,
): PlatformProfileMap[TPlatform] {
  const existingProfile = getPlatformProfile(videoId, platform);
  if (existingProfile) {
    return existingProfile;
  }

  return updatePlatformProfile(videoId, platform, getDefaultPlatformConfig(platform));
}

function upsertBilibiliPlatformProfile(video: VideoDetailRecord): void {
  const profile = toBilibiliPlatformProfile(video, getPlatformProfileRecord(video.asset.id, "bilibili"));
  upsertPlatformProfile(video.asset.id, "bilibili", profile.config, video.asset.updatedAt);
}

export function initializeDatabase(userDataPath: string): Database.Database {
  if (database) {
    return database;
  }

  migrateLegacyDatabaseFile(userDataPath);
  database = new Database(resolveDatabasePath(userDataPath));
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  database.exec(CREATE_VIDEOS_TABLE_SQL);
  database.exec(CREATE_VIDEO_PLATFORM_PROFILES_TABLE_SQL);
  database.exec(CREATE_SELECTED_AT_INDEX_SQL);
  database.exec(CREATE_UPDATED_AT_INDEX_SQL);
  database.exec(CREATE_VIDEO_PLATFORM_PROFILES_UNIQUE_INDEX_SQL);
  database.exec(CREATE_VIDEO_PLATFORM_PROFILES_VIDEO_ID_INDEX_SQL);
  migrateLegacyBilibiliProfiles();
  return database;
}

export function getDatabase(): Database.Database {
  if (!database) {
    throw new Error("Database has not been initialized.");
  }
  return database;
}

export function listVideoDetails(input: ListVideosInput): PaginatedVideoDetailRecord {
  const normalizedInput = normalizeListVideosInput(input);
  const assets = listVideoAssetRows(normalizedInput);
  const groupedProfiles = groupPlatformProfilesByVideoId(listPlatformProfileRecords(assets.map((asset) => asset.id)));

  return {
    items: assets.map((asset) => toVideoDetail(asset, groupedProfiles.get(asset.id) ?? [])),
    total: countVideoAssets(),
    page: normalizedInput.page,
    pageSize: normalizedInput.pageSize,
  };
}

export function getVideoDetailById(videoId: string): VideoDetailRecord | null {
  const asset = getVideoAssetRow(videoId);
  if (!asset) {
    return null;
  }

  const profileRecords = listPlatformProfileRecords([videoId]);
  return toVideoDetail(asset, profileRecords);
}

export function createVideo(input: CreateVideoInput): VideoDetailRecord {
  const fileStats = fs.statSync(input.localPath);
  if (!fileStats.isFile()) {
    throw new Error("Selected path is not a file.");
  }

  const fileName = path.basename(input.localPath);
  const extension = path.extname(fileName);
  const now = new Date().toISOString();
  const createdVideo: VideoDetailRecord = {
    asset: {
      id: randomUUID(),
      title: deriveTitle(fileName),
      summary: null,
      localPath: input.localPath,
      fileName,
      format: extension ? extension.slice(1).toLowerCase() : null,
      size: fileStats.size,
      selectedAt: now,
      createdAt: now,
      updatedAt: now,
    },
    platformProfiles: [
      {
        id: randomUUID(),
        videoId: "",
        platform: "bilibili",
        enabled: true,
        config: {
          publishMode: "draft",
          videoType: null,
          partition: null,
          visibility: "private",
          tags: [],
        },
        createdAt: now,
        updatedAt: now,
      },
    ],
  };

  createdVideo.platformProfiles[0].videoId = createdVideo.asset.id;

  getDatabase().prepare(
    `
      INSERT INTO videos (
        id,
        title,
        summary,
        local_path,
        file_name,
        format,
        size,
        selected_at,
        created_at,
        updated_at
      ) VALUES (
        @id,
        @title,
        @summary,
        @localPath,
        @fileName,
        @format,
        @size,
        @selectedAt,
        @createdAt,
        @updatedAt
      )
    `,
  ).run({
    id: createdVideo.asset.id,
    title: createdVideo.asset.title,
    summary: createdVideo.asset.summary,
    localPath: createdVideo.asset.localPath,
    fileName: createdVideo.asset.fileName,
    format: createdVideo.asset.format,
    size: createdVideo.asset.size,
    selectedAt: createdVideo.asset.selectedAt,
    createdAt: createdVideo.asset.createdAt,
    updatedAt: createdVideo.asset.updatedAt,
  });

  upsertBilibiliPlatformProfile(createdVideo);
  return createdVideo;
}

export function deleteVideo(videoId: string): { success: boolean; id: string } {
  const result = getDatabase().prepare("DELETE FROM videos WHERE id = ?").run(videoId);
  return {
    success: result.changes > 0,
    id: videoId,
  };
}
