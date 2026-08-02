import { getChatGPTUser } from "../../../chatgpt-auth";
import { verifyOwner } from "../../../../db/content-store";
import { listMetrics, productMetricEvents } from "../../../../db/metric-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user || !(await verifyOwner(user.userId))) {
    return Response.json({ error: "Owner access is required." }, { status: 403 });
  }
  const rows = await listMetrics(90);
  return Response.json(
    { days: 90, events: productMetricEvents, rows },
    { headers: { "Cache-Control": "no-store" } },
  );
}
