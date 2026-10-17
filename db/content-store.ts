import { env } from "cloudflare:workers";
import { buildContentReadQuery, type ContentReadOptions } from "../lib/content-read-query";
import {
  isSupportedContentFile,
  validateContentCollection,
} from "../lib/content-catalog";

export { isSupportedContentFile };

export type ContentRow = {
  file_name: string;
  version: number;
  payload_base64: string;
  sha256: string;
  minimum_build: number;
  published_at: number;
  published_by: string;
};

export function getContentDb() {
  if (!env.DB) throw new Error("The curriculum database is unavailable.");
  return env.DB;
}

export async function ensureContentSchema() {
  const db = getContentDb();
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS content_files (
      file_name TEXT PRIMARY KEY NOT NULL,
      version INTEGER NOT NULL,
      payload_base64 TEXT NOT NULL,
      sha256 TEXT NOT NULL,
      minimum_build INTEGER NOT NULL DEFAULT 1,
      published_at INTEGER NOT NULL,
      published_by TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS content_versions (
      file_name TEXT NOT NULL,
      version INTEGER NOT NULL,
      payload_base64 TEXT NOT NULL,
      sha256 TEXT NOT NULL,
      minimum_build INTEGER NOT NULL DEFAULT 1,
      published_at INTEGER NOT NULL,
      published_by TEXT NOT NULL,
      PRIMARY KEY (file_name, version)
    )`),
  ]);
  await db.prepare("PRAGMA optimize").run();
}

export async function getOwnerUserId() {
  await ensureContentSchema();
  const row = await getContentDb()
    .prepare("SELECT value FROM app_settings WHERE key = ?")
    .bind("owner_user_id")
    .first<{ value: string }>();
  return row?.value ?? null;
}

export async function claimOwnership(userId: string) {
  await ensureContentSchema();
  const now = Date.now();
  await getContentDb()
    .prepare(
      "INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)",
    )
    .bind("owner_user_id", userId, now)
    .run();
  return getOwnerUserId();
}

type ContentReadRow = Omit<ContentRow, "payload_base64" | "published_by"> & { payload_base64?: string };

export async function listContentRows(options: ContentReadOptions = {}) {
  await ensureContentSchema();
  const { sql, bindings } = buildContentReadQuery(options);
  const result = await getContentDb()
    .prepare(sql)
    .bind(...bindings)
    .all<ContentReadRow>();
  return result.results;
}

export async function getContentVersionCounts() {
  await ensureContentSchema();
  const result = await getContentDb()
    .prepare("SELECT file_name, COUNT(*) AS version_count FROM content_versions GROUP BY file_name")
    .all<{ file_name: string; version_count: number }>();
  return new Map(result.results.map((row) => [row.file_name, Number(row.version_count)]));
}

export async function verifyOwner(userId: string) {
  const ownerId = await getOwnerUserId();
  return ownerId !== null && ownerId === userId;
}

export function activationCode() {
  return String((env as unknown as Record<string, unknown>).ACTIVATION_CODE ?? "");
}

export function decodeAndValidatePayload(fileName: string, payloadBase64: string) {
  if (!isSupportedContentFile(fileName)) throw new Error("Unsupported curriculum filename.");
  if (!payloadBase64 || payloadBase64.length > 4_500_000) {
    throw new Error("The curriculum file is empty or too large.");
  }

  let parsed: unknown;
  try {
    const binary = atob(payloadBase64);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error("The selected file is not valid JSON.");
  }

  return validateContentCollection(fileName, parsed).length;
}

export async function sha256Hex(payloadBase64: string) {
  const binary = atob(payloadBase64);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
