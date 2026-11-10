export const CHART_WINDOW_MS = 60_000

export type ChartData = [seconds: number[], ...values: number[][]]

export function chartWindow<Sample extends { timeMs: number }>(
  history: readonly Sample[],
  pickValues: readonly ((sample: Sample) => number)[],
  windowMs = CHART_WINDOW_MS,
): ChartData {
  const latest = history.at(-1)
  if (!latest) {
    return [[], ...pickValues.map(() => [])]
  }

  const recent = history.filter((sample) => sample.timeMs >= latest.timeMs - windowMs)
  const seconds = recent.map((sample) => (sample.timeMs - latest.timeMs) / 1000)
  return [seconds, ...pickValues.map((pick) => recent.map(pick))]
}
