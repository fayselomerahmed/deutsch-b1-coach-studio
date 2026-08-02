import {
  entitlementStatus,
  getEntitlementByAccessId,
} from "../../../../db/entitlement-store";

export const dynamic = "force-dynamic";

const responseHeaders = {
  "Cache-Control": "private, no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: responseHeaders });
}

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 1_024) throw new Error("The access request is too large.");
    const payload = (await request.json()) as { accessId?: string };
    const accessId = payload.accessId ?? "";
    const row = await getEntitlementByAccessId(accessId);
    const status = entitlementStatus(row);
    return Response.json({
      accessLevel: row?.access_level ?? "free",
      status,
      isActive: status === "active",
      expiresAt: row?.expires_at ? new Date(row.expires_at).toISOString() : null,
      serverTime: new Date().toISOString(),
    }, {
      headers: responseHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The access status could not be checked.";
    return Response.json({ error: message }, { status: 400, headers: responseHeaders });
  }
}
