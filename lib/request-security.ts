/** Reject browser cross-site mutations before invoking the trusted-gateway auth adapter. */
export function rejectCrossOriginWrite(request: Request): Response | null {
  const origin = request.headers.get("origin");
  const crossSite = request.headers.get("sec-fetch-site") === "cross-site";
  let sameOrigin = !origin;
  if (origin) {
    try {
      sameOrigin = new URL(origin).origin === new URL(request.url).origin;
    } catch {
      sameOrigin = false;
    }
  }
  return crossSite || !sameOrigin
    ? Response.json({ error: "Cross-origin writes are not allowed." }, { status: 403 })
    : null;
}
