import { getChatGPTUser } from "../../../chatgpt-auth";
import {
  decodeAndValidatePayload,
  getContentDb,
  isSupportedContentFile,
  sha256Hex,
  verifyOwner,
} from "../../../../db/content-store";

async function requireOwner() {
  const user = await getChatGPTUser();
  if (!user || !(await verifyOwner(user.userId))) return null;
  return user;
}

export async function POST(request: Request) {
  const user = await requireOwner();
  if (!user) return Response.json({ error: "Owner access is required." }, { status: 403 });

  try {
    const payload = (await request.json()) as {
      fileName?: string;
      payloadBase64?: string;
      sha256?: string;
      minimumBuild?: number;
    };
    const fileName = payload.fileName?.trim() ?? "";
    const payloadBase64 = payload.payloadBase64 ?? "";
    const itemCount = decodeAndValidatePayload(fileName, payloadBase64);
    const calculatedHash = await sha256Hex(payloadBase64);
    if (calculatedHash !== payload.sha256?.toLowerCase()) {
      return Response.json({ error: "The file integrity check failed." }, { status: 400 });
    }

    const version = Date.now();
    const minimumBuild = Math.max(1, Math.floor(payload.minimumBuild ?? 1));
    const db = getContentDb();
    await db.batch([
      db.prepare(`INSERT INTO content_versions
        (file_name, version, payload_base64, sha256, minimum_build, published_at, published_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .bind(fileName, version, payloadBase64, calculatedHash, minimumBuild, version, user.userId),
      db.prepare(`INSERT INTO content_files
        (file_name, version, payload_base64, sha256, minimum_build, published_at, published_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(file_name) DO UPDATE SET
          version = excluded.version,
          payload_base64 = excluded.payload_base64,
          sha256 = excluded.sha256,
          minimum_build = excluded.minimum_build,
          published_at = excluded.published_at,
          published_by = excluded.published_by`)
        .bind(fileName, version, payloadBase64, calculatedHash, minimumBuild, version, user.userId),
    ]);

    return Response.json({ fileName, version, itemCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The file could not be published.";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const user = await requireOwner();
  if (!user) return Response.json({ error: "Owner access is required." }, { status: 403 });

  const fileName = new URL(request.url).searchParams.get("file_name") ?? "";
  if (!isSupportedContentFile(fileName)) {
    return Response.json({ error: "Unsupported curriculum filename." }, { status: 400 });
  }
  await getContentDb().prepare("DELETE FROM content_files WHERE file_name = ?").bind(fileName).run();
  return Response.json({ removed: true });
}
