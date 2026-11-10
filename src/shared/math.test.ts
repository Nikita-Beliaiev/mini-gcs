import { describe, expect, it } from 'vitest'
import { clamp } from './math'

describe('clamp', () => {
  it.each([
    [5, 0, 10, 5],
    [-1, 0, 10, 0],
    [11, 0, 10, 10],
  ])('clamps %d into [%d, %d] as %d', (value, min, max, expected) => {
    expect(clamp(value, min, max)).toBe(expected)
  })
})
