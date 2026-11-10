export const RECONNECT_BASE_DELAY_MS = 1000
export const RECONNECT_MAX_DELAY_MS = 10_000
const JITTER = 0.2

export function reconnectDelayMs(attempt: number, random: () => number = Math.random): number {
  const exponential = Math.min(RECONNECT_MAX_DELAY_MS, RECONNECT_BASE_DELAY_MS * 2 ** (attempt - 1))
  return Math.round(exponential * (1 - JITTER + 2 * JITTER * random()))
}
