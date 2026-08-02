import { env } from "cloudflare:workers";

export type AccessLevel = "trial" | "full";

export type EntitlementRow = {
  subject_hash: string;
  access_suffix: string;
  label: string;
  access_level: AccessLevel;
  expires_at: number | null;
  enabled: number;
  created_at: number;
  updated_at: number;
  updated_by: string;
};

export function getEntitlementDb() {
  if (!env.DB) throw new Error("The access database is unavailable.");
  return env.DB;
}

export async function ensureEntitlementSchema() {
  await getEntitlementDb().prepare(`CREATE TABLE IF NOT EXISTS access_entitlements (
    subject_hash TEXT PRIMARY KEY NOT NULL,
    access_suffix TEXT NOT NULL,
    label TEXT NOT NULL,
    access_level TEXT NOT NULL CHECK (access_level IN ('trial', 'full')),
    expires_at INTEGER,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    updated_by TEXT NOT NULL
  )`).run();
}

export function normalizeAccessId(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function validateAccessId(value: string) {
  const normalized = normalizeAccessId(value);
  if (!/^DC-[A-F0-9]{4}(?:-[A-F0-9]{4}){3}$/.test(normalized)) {
    throw new Error("Enter the learner's Access ID in the format DC-1234-ABCD-5678-EF90.");
  }
  return normalized;
}

export async function hashAccessId(value: string) {
  const bytes = new TextEncoder().encode(validateAccessId(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function listEntitlements() {
  await ensureEntitlementSchema();
  const result = await getEntitlementDb()
    .prepare("SELECT * FROM access_entitlements ORDER BY enabled DESC, updated_at DESC")
    .all<EntitlementRow>();
  return result.results;
}

export async function getEntitlementByHash(subjectHash: string) {
  await ensureEntitlementSchema();
  return getEntitlementDb()
    .prepare("SELECT * FROM access_entitlements WHERE subject_hash = ?")
    .bind(subjectHash)
    .first<EntitlementRow>();
}

export async function getEntitlementByAccessId(accessId: string) {
  return getEntitlementByHash(await hashAccessId(accessId));
}

export async function saveEntitlement(input: {
  accessId?: string;
  subjectHash?: string;
  label: string;
  accessLevel: AccessLevel;
  expiresAt: number | null;
  enabled: boolean;
  updatedBy: string;
}) {
  await ensureEntitlementSchema();
  const normalizedAccessId = input.accessId ? validateAccessId(input.accessId) : null;
  const subjectHash = normalizedAccessId ? await hashAccessId(normalizedAccessId) : input.subjectHash?.trim().toLowerCase() ?? "";
  if (!/^[a-f0-9]{64}$/.test(subjectHash)) throw new Error("The learner access record is invalid.");

  const existing = await getEntitlementByHash(subjectHash);
  const label = input.label.trim();
  if (!label || label.length > 120) throw new Error("Add a short learner name or reference.");
  if (input.enabled && input.accessLevel === "trial" && (!input.expiresAt || input.expiresAt <= Date.now())) {
    throw new Error("A trial must end in the future.");
  }

  const now = Date.now();
  const suffix = normalizedAccessId?.slice(-9) ?? existing?.access_suffix;
  if (!suffix) throw new Error("Enter the learner's Access ID when creating a new record.");

  await getEntitlementDb().prepare(`INSERT INTO access_entitlements
    (subject_hash, access_suffix, label, access_level, expires_at, enabled, created_at, updated_at, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(subject_hash) DO UPDATE SET
      label = excluded.label,
      access_level = excluded.access_level,
      expires_at = excluded.expires_at,
      enabled = excluded.enabled,
      updated_at = excluded.updated_at,
      updated_by = excluded.updated_by`)
    .bind(
      subjectHash,
      suffix,
      label,
      input.accessLevel,
      input.accessLevel === "full" ? null : input.expiresAt,
      input.enabled ? 1 : 0,
      existing?.created_at ?? now,
      now,
      input.updatedBy,
    )
    .run();

  return getEntitlementByHash(subjectHash);
}

export async function removeEntitlement(subjectHash: string) {
  if (!/^[a-f0-9]{64}$/.test(subjectHash)) throw new Error("The learner access record is invalid.");
  await ensureEntitlementSchema();
  await getEntitlementDb().prepare("DELETE FROM access_entitlements WHERE subject_hash = ?").bind(subjectHash).run();
}

export function entitlementStatus(row: EntitlementRow | null, now = Date.now()) {
  if (!row) return "not_found" as const;
  if (!row.enabled) return "disabled" as const;
  if (row.access_level === "trial" && (!row.expires_at || row.expires_at <= now)) return "expired" as const;
  return "active" as const;
}
