import { isSupportedContentFile, listContentRows } from "../../../../db/content-store";
import type { SupportedContentFile } from "../../../../lib/content-catalog";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const select = new Set((url.searchParams.get("select") ?? "").split(",").map((field) => field.trim()).filter(Boolean));
  const filter = url.searchParams.get("file_name");
  let fileNames: SupportedContentFile[] | undefined;

  if (filter?.startsWith("in.(") && filter.endsWith(")")) {
    fileNames = filter.slice(4, -1).split(",").filter(isSupportedContentFile);
  }

  const includePayload = select.size === 0 || select.has("payload_base64");
  const rows = await listContentRows({ includePayload, fileNames });
  const response = rows.map((row) => ({
    file_name: row.file_name,
    version: row.version,
    ...(includePayload ? { payload_base64: row.payload_base64 } : {}),
    sha256: row.sha256,
    minimum_build: row.minimum_build,
    published_at: new Date(row.published_at).toISOString(),
  }));

  return Response.json(response, {
    headers: {
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
