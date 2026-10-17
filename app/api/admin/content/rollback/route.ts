import { getChatGPTUser } from "../../../../chatgpt-auth";
import { rejectCrossOriginWrite } from "../../../../../lib/request-security";
import {
  ContentRow,
  getContentDb,
  isSupportedContentFile,
  verifyOwner,
} from "../../../../../db/content-store";

export async function POST(request: Request) {
  const rejection = rejectCrossOriginWrite(request);
  if (rejection) return rejection;
  const user = await getChatGPTUser();
  if (!user || !(await verifyOwner(user.userId))) {
    return Response.json({ error: "Owner access is required." }, { status: 403 });
  }

  const payload = (await request.json()) as { fileName?: string };
  const fileName = payload.fileName?.trim() ?? "";
  if (!isSupportedContentFile(fileName)) {
    return Response.json({ error: "Unsupported curriculum filename." }, { status: 400 });
  }

  const db = getContentDb();
  const previous = await db
    .prepare("SELECT * FROM content_versions WHERE file_name = ? ORDER BY version DESC LIMIT 1 OFFSET 1")
    .bind(fileName)
    .first<ContentRow>();
  if (!previous) return Response.json({ error: "No previous version is available." }, { status: 404 });

  const version = Date.now();
  await db.batch([
    db.prepare(`INSERT INTO content_versions
      (file_name, version, payload_base64, sha256, minimum_build, published_at, published_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .bind(fileName, version, previous.payload_base64, previous.sha256, previous.minimum_build, version, user.userId),
    db.prepare(`UPDATE content_files SET
      version = ?, payload_base64 = ?, sha256 = ?, minimum_build = ?, published_at = ?, published_by = ?
      WHERE file_name = ?`)
      .bind(version, previous.payload_base64, previous.sha256, previous.minimum_build, version, user.userId, fileName),
  ]);
  return Response.json({ fileName, version });
}
