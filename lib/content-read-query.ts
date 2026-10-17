import type { SupportedContentFile } from "./content-catalog";

export type ContentReadOptions = {
  includePayload?: boolean;
  fileNames?: readonly SupportedContentFile[];
};

/** Keep payloads and unrelated collections out of D1 results, not just the response. */
export function buildContentReadQuery({ includePayload = true, fileNames }: ContentReadOptions = {}) {
  const columns = "file_name, version, sha256, minimum_build, published_at";
  const names = fileNames === undefined ? undefined : [...new Set(fileNames)];
  const where = names === undefined
    ? ""
    : names.length === 0
      ? " WHERE 1 = 0"
      : ` WHERE file_name IN (${names.map(() => "?").join(", ")})`;
  return {
    sql: `SELECT ${columns}${includePayload ? ", payload_base64" : ""} FROM content_files${where} ORDER BY file_name`,
    bindings: names ?? [],
  };
}
