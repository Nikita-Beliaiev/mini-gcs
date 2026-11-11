export interface FakeFrames {
  now: () => number
  scheduleFrame: (callback: () => void) => void
  runFrameAfter: (elapsedMs: number) => void
}

export function createFakeFrames(): FakeFrames {
  let clockMs = 0
  let pending: (() => void)[] = []

  return {
    now: () => clockMs,
    scheduleFrame: (callback) => {
      pending.push(callback)
    },
    runFrameAfter: (elapsedMs) => {
      clockMs += elapsedMs
      const frames = pending
      pending = []
      for (const frame of frames) {
        frame()
      }
    },
  }
}
