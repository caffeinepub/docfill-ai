/**
 * Travel Fee Engine for DocFill AI Notary Scheduler
 * Calculates zone-based travel fees for mobile notary sessions.
 */

export function calculateTravelFee(distanceMiles: number): number {
  if (distanceMiles <= 10) return 0;
  if (distanceMiles <= 25) return 25;
  return 25 + 1.5 * (distanceMiles - 25);
}

export function getZoneLabel(distanceMiles: number): string {
  if (distanceMiles <= 10) return "Zone 1 — Local Service (Included)";
  if (distanceMiles <= 25) return "Zone 2 — Standard Travel";
  return "Zone 3 — Extended Service Area";
}

/**
 * Deterministic distance estimator (demo stub).
 * Same inputs always return the same output.
 * Returns a value in the range [3, 43] miles.
 */
export function estimateDistance(addr1: string, addr2: string): number {
  const hash1 = addr1
    .toLowerCase()
    .split("")
    .reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const hash2 = addr2
    .toLowerCase()
    .split("")
    .reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return (Math.abs(hash1 - hash2) % 40) + 3;
}
