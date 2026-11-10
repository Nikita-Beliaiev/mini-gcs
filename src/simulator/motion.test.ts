import { describe, expect, it } from 'vitest'
import { approach, clamp, turnToward } from './motion'

describe('clamp', () => {
  it.each([
    [5, 0, 10, 5],
    [-1, 0, 10, 0],
    [11, 0, 10, 10],
  ])('clamps %d into [%d, %d] as %d', (value, min, max, expected) => {
    expect(clamp(value, min, max)).toBe(expected)
  })
})

describe('approach', () => {
  it('moves towards the target by at most one step', () => {
    expect(approach(0, 10, 3)).toBe(3)
    expect(approach(10, 0, 3)).toBe(7)
  })

  it('snaps to the target when it is within one step', () => {
    expect(approach(9, 10, 3)).toBe(10)
    expect(approach(10, 10, 3)).toBe(10)
  })
})

describe('turnToward', () => {
  it('turns by at most the allowed angle', () => {
    expect(turnToward(0, 90, 30)).toBe(30)
    expect(turnToward(90, 0, 30)).toBe(60)
  })

  it('takes the short way across north', () => {
    expect(turnToward(350, 20, 15)).toBe(5)
    expect(turnToward(10, 340, 15)).toBe(355)
  })

  it('reaches the target heading when the turn is small enough', () => {
    expect(turnToward(80, 90, 30)).toBe(90)
  })
})
