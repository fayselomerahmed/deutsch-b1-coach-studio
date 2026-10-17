/** Build numbers cross a JSON boundary; never coerce or round untrusted values. */
export function parseMinimumBuild(value: unknown): number {
  if (value === undefined) return 1;
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isSafeInteger(value) || value < 1) {
    throw new Error("Minimum build must be a positive safe integer.");
  }
  return value;
}
