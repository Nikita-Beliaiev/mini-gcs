import { describe, expect, it } from 'vitest'
import { createRandom, randomBetween } from './random'

function take(count: number, random: () => number): number[] {
  return Array.from({ length: count }, () => random())
}

describe('createRandom', () => {
  it('repeats the same sequence for the same seed', () => {
    expect(take(10, createRandom(42))).toEqual(take(10, createRandom(42)))
  })

  it('produces a different sequence for a different seed', () => {
    expect(take(10, createRandom(1))).not.toEqual(take(10, createRandom(2)))
  })

  it('stays within [0, 1) and spreads values across the range', () => {
    const values = take(10_000, createRandom(7))
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length

    expect(Math.min(...values)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...values)).toBeLessThan(1)
    expect(mean).toBeCloseTo(0.5, 1)
  })
})

describe('randomBetween', () => {
  it('scales values into the requested range', () => {
    const random = createRandom(3)
    const values = Array.from({ length: 1000 }, () => randomBetween(random, -2, 2))

    expect(Math.min(...values)).toBeGreaterThanOrEqual(-2)
    expect(Math.max(...values)).toBeLessThan(2)
  })
})
