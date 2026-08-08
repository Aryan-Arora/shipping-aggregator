const STAGES = ["booked", "picked_up", "in_transit", "delivered"];

// Mocks otherwise always report "booked" forever, which makes it impossible
// to demo/verify the tracking-reconciliation job (there's nothing for it to
// find). This tracks, per AWB, how long it's been since first polled and
// steps through delivery stages over time — deterministic, in-memory, mock
// data only.
const firstPolledAt = new Map<string, number>();

export function mockTrackingStatus(awb: string, stageSeconds = 20): { status: string; occurredAt: string } {
  const now = Date.now();
  if (!firstPolledAt.has(awb)) firstPolledAt.set(awb, now);

  const elapsedSeconds = (now - firstPolledAt.get(awb)!) / 1000;
  const stageIndex = Math.min(STAGES.length - 1, Math.floor(elapsedSeconds / stageSeconds));

  return { status: STAGES[stageIndex], occurredAt: new Date().toISOString() };
}
