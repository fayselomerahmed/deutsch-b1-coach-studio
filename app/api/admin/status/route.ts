import { getChatGPTUser } from "../../../chatgpt-auth";
import {
  getContentVersionCounts,
  getOwnerUserId,
  listContentRows,
} from "../../../../db/content-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in is required." }, { status: 401 });

  const ownerId = await getOwnerUserId();
  if (!ownerId) return Response.json({ requiresActivation: true, files: [] });
  if (ownerId !== user.userId) {
    return Response.json({ error: "This dashboard belongs to another owner." }, { status: 403 });
  }

  const rows = await listContentRows({ includePayload: false });
  const versionCounts = await getContentVersionCounts();
  return Response.json({
    requiresActivation: false,
    files: rows.map((row) => ({
      fileName: row.file_name,
      version: row.version,
      minimumBuild: row.minimum_build,
      publishedAt: row.published_at,
      canRollback: (versionCounts.get(row.file_name) ?? 0) > 1,
    })),
  });
}
