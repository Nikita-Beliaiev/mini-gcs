import { describe, expect, it } from 'vitest'
import { reconnectDelayMs } from './backoff'

const MIDDLE = () => 0.5

describe('reconnectDelayMs', () => {
  it('doubles the delay with every attempt', () => {
    expect([1, 2, 3, 4].map((attempt) => reconnectDelayMs(attempt, MIDDLE))).toEqual([
      1000, 2000, 4000, 8000,
    ])
  })

  it('never waits longer than 10 s', () => {
    expect(reconnectDelayMs(5, MIDDLE)).toBe(10_000)
    expect(reconnectDelayMs(30, MIDDLE)).toBe(10_000)
  })

  it('spreads the delay by 20% either way so clients do not reconnect in lockstep', () => {
    expect(reconnectDelayMs(2, () => 0)).toBe(1600)
    expect(reconnectDelayMs(2, () => 1)).toBe(2400)
  })
})
