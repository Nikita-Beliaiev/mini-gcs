import { describe, expect, it } from 'vitest'
import { horizonTransform, rollPointerTransform } from './attitude'

describe('horizonTransform', () => {
  it('keeps the horizon in place when level', () => {
    expect(horizonTransform(0, 0)).toBe('rotate(0.00) translate(0 0.00)')
  })

  it('tilts the horizon against the roll', () => {
    expect(horizonTransform(15, 0)).toBe('rotate(-15.00) translate(0 0.00)')
  })

  it('moves the horizon down when the nose is up', () => {
    expect(horizonTransform(0, 10)).toBe('rotate(0.00) translate(0 20.00)')
    expect(horizonTransform(0, -10)).toBe('rotate(0.00) translate(0 -20.00)')
  })

  it('stops moving the horizon beyond 40 degrees of pitch', () => {
    expect(horizonTransform(0, 70)).toBe('rotate(0.00) translate(0 80.00)')
  })
})

describe('rollPointerTransform', () => {
  it('turns the pointer with the horizon', () => {
    expect(rollPointerTransform(-20)).toBe('rotate(20.00)')
  })
})
