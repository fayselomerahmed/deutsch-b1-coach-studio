import { getChatGPTUser } from "../../../chatgpt-auth";
import { verifyOwner } from "../../../../db/content-store";
import {
  entitlementStatus,
  getEntitlementByHash,
  listEntitlements,
  removeEntitlement,
  saveEntitlement,
  type AccessLevel,
  type EntitlementRow,
} from "../../../../db/entitlement-store";

async function requireOwner() {
  const user = await getChatGPTUser();
  if (!user || !(await verifyOwner(user.userId))) return null;
  return user;
}

export async function GET() {
  const user = await requireOwner();
  if (!user) return Response.json({ error: "Owner access is required." }, { status: 403 });

  const rows = await listEntitlements();
  return Response.json({
    entitlements: rows.map((row: EntitlementRow) => ({
      subjectHash: row.subject_hash,
      accessSuffix: row.access_suffix,
      label: row.label,
      accessLevel: row.access_level,
      expiresAt: row.expires_at,
      enabled: Boolean(row.enabled),
      status: entitlementStatus(row),
      updatedAt: row.updated_at,
    })),
  });
}

export async function POST(request: Request) {
  const user = await requireOwner();
  if (!user) return Response.json({ error: "Owner access is required." }, { status: 403 });

  try {
    const payload = (await request.json()) as {
      accessId?: string;
      subjectHash?: string;
      label?: string;
      accessLevel?: AccessLevel;
      trialDays?: number;
      extendTrial?: boolean;
      preserveExpiry?: boolean;
      enabled?: boolean;
    };
    if (!payload.accessLevel || !["trial", "full"].includes(payload.accessLevel)) {
      throw new Error("Choose Trial or Full access.");
    }

    const current = payload.subjectHash ? await getEntitlementByHash(payload.subjectHash) : null;
    const trialDays = Math.min(365, Math.max(1, Math.floor(payload.trialDays ?? 14)));
    const trialBase = payload.extendTrial && current?.expires_at
      ? Math.max(Date.now(), current.expires_at)
      : Date.now();
    const expiresAt = payload.accessLevel === "trial"
      ? payload.preserveExpiry && current?.expires_at
        ? current.expires_at
        : trialBase + trialDays * 24 * 60 * 60 * 1000
      : null;

    const saved = await saveEntitlement({
      accessId: payload.accessId,
      subjectHash: payload.subjectHash,
      label: payload.label ?? current?.label ?? "",
      accessLevel: payload.accessLevel,
      expiresAt,
      enabled: payload.enabled ?? (current?.enabled !== 0),
      updatedBy: user.userId,
    });
    return Response.json({ saved: Boolean(saved) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The access record could not be saved.";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const user = await requireOwner();
  if (!user) return Response.json({ error: "Owner access is required." }, { status: 403 });
  try {
    const subjectHash = new URL(request.url).searchParams.get("subject_hash") ?? "";
    await removeEntitlement(subjectHash);
    return Response.json({ removed: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The access record could not be removed.";
    return Response.json({ error: message }, { status: 400 });
  }
}
