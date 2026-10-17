import {
  incrementMetric,
  validateMetricEvent,
} from "../../../../db/metric-store";
import { readBoundedJson } from "../../../../lib/bounded-json";

export async function POST(request: Request) {
  try {
    const payload = (await readBoundedJson(request, 1_024)) as { event?: unknown; appBuild?: unknown };
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
