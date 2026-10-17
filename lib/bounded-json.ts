/** Bound actual bytes before JSON parsing; Content-Length alone is not trustworthy. */
export async function readBoundedJson(request: Request, maximumBytes: number): Promise<unknown> {
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 1) {
    throw new Error("The request size limit is invalid.");
  }
  if (Number(request.headers.get("content-length")) > maximumBytes) {
    await request.body?.cancel().catch(() => {});
    throw new Error("The request is too large.");
  }
  if (!request.body) throw new Error("The request must contain valid JSON.");

  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytesRead = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      if (bytesRead > maximumBytes) {
        throw new Error("The request is too large.");
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text) as unknown;
  } catch (error) {
    // Stop malformed streams too, and preserve the original validation/read error.
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
}
