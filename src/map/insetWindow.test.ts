import { describe, expect, it } from 'vitest'
import {
  clampInsetWidth,
  draggedInsetWidth,
  INSET_MAX_WIDTH,
  INSET_MIN_WIDTH,
  insetWidthForKey,
  otherView,
  toggledInsetWidth,
} from './insetWindow'

describe('insetWindow', () => {
  it('swaps the views', () => {
    expect(otherView('map')).toBe('camera')
    expect(otherView('camera')).toBe('map')
  })

  it('keeps the small window between its smallest and largest width', () => {
    expect(clampInsetWidth(100)).toBe(INSET_MIN_WIDTH)
    expect(clampInsetWidth(5000)).toBe(INSET_MAX_WIDTH)
    expect(clampInsetWidth(400.4)).toBe(400)
  })

  it('switches between the small and the large size', () => {
    expect(toggledInsetWidth('camera', 280)).toBe(560)
    expect(toggledInsetWidth('camera', 560)).toBe(280)
    expect(toggledInsetWidth('camera', 700)).toBe(280)
    expect(toggledInsetWidth('map', 400)).toBe(560)
  })

  it('grows the window when its inner corner is dragged towards the map centre', () => {
    expect(draggedInsetWidth(280, 900, 800)).toBe(380)
    expect(draggedInsetWidth(280, 900, 950)).toBe(230)
    expect(draggedInsetWidth(280, 900, 1200)).toBe(INSET_MIN_WIDTH)
  })

  it('resizes the window with the keys of a slider', () => {
    expect(insetWidthForKey(280, 'ArrowUp')).toBe(320)
    expect(insetWidthForKey(280, 'ArrowRight')).toBe(320)
    expect(insetWidthForKey(280, 'ArrowDown')).toBe(240)
    expect(insetWidthForKey(280, 'Home')).toBe(INSET_MIN_WIDTH)
    expect(insetWidthForKey(280, 'End')).toBe(INSET_MAX_WIDTH)
    expect(insetWidthForKey(280, 'Enter')).toBeNull()
  })
})
