let lastShareHandledAtMs = 0;

export function markShareHandledNow(ts: number = Date.now()): void {
  lastShareHandledAtMs = ts;
}

export function getLastShareHandledAtMs(): number {
  return lastShareHandledAtMs;
}
