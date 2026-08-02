import {
  incrementMetric,
  validateMetricEvent,
} from "../../../../db/metric-store";

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (contentLength > 1_024) throw new Error("The request is too large.");
    const payload = (await request.json()) as { event?: unknown; appBuild?: unknown };
    const event = validateMetricEvent(payload.event);
    const appBuild = Math.floor(Number(payload.appBuild));
    if (!Number.isSafeInteger(appBuild) || appBuild < 1 || appBuild > 1_000_000) {
      throw new Error("Invalid app build.");
    }
    await incrementMetric(event, appBuild);
    return Response.json(
      { accepted: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "The milestone could not be counted.";
    return Response.json({ error: message }, { status: 400 });
  }
}
