import { env } from "cloudflare:workers";

export const productMetricEvents = [
  "onboardingCompleted",
  "lessonStarted",
  "lessonCompleted",
  "speakingCorrectionReceived",
  "readinessCheckCompleted",
  "paywallViewed",
  "purchaseStarted",
  "purchaseCompleted",
  "purchaseRestored",
] as const;

export type ProductMetricEvent = (typeof productMetricEvents)[number];

export type ProductMetricRow = {
  day: string;
  event: ProductMetricEvent;
  count: number;
};

function getMetricDb() {
  if (!env.DB) throw new Error("The product metrics database is unavailable.");
  return env.DB;
}

export async function ensureMetricSchema() {
  await getMetricDb().prepare(`CREATE TABLE IF NOT EXISTS product_metrics (
    day TEXT NOT NULL,
    event TEXT NOT NULL,
    app_build INTEGER NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (day, event, app_build)
  )`).run();
}

export function validateMetricEvent(value: unknown): ProductMetricEvent {
  if (typeof value !== "string" || !productMetricEvents.includes(value as ProductMetricEvent)) {
    throw new Error("Unsupported product milestone.");
  }
  return value as ProductMetricEvent;
}

export async function incrementMetric(event: ProductMetricEvent, appBuild: number) {
  await ensureMetricSchema();
  const day = new Date().toISOString().slice(0, 10);
  await getMetricDb().prepare(`INSERT INTO product_metrics (day, event, app_build, count)
    VALUES (?, ?, ?, 1)
    ON CONFLICT(day, event, app_build) DO UPDATE SET count = count + 1`)
    .bind(day, event, appBuild)
    .run();
}

export async function listMetrics(days = 90) {
  await ensureMetricSchema();
  const since = new Date(Date.now() - (Math.max(1, days) - 1) * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const result = await getMetricDb()
    .prepare(`SELECT day, event, SUM(count) AS count
      FROM product_metrics
      WHERE day >= ?
      GROUP BY day, event
      ORDER BY day ASC, event ASC`)
    .bind(since)
    .all<ProductMetricRow>();
  return result.results.map((row) => ({ ...row, count: Number(row.count) }));
}
