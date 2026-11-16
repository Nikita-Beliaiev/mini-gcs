import { describe, expect, it } from 'vitest'
import { toRadians } from '../geo/geo'
import { fieldOfViewAt, moveZoom } from './cameraLens'

describe('fieldOfViewAt', () => {
  it('gives the wide view of a 16:9 camera without zoom', () => {
    const view = fieldOfViewAt(1)

    expect(view.verticalFovDeg).toBeCloseTo(36.87, 2)
    expect(view.horizontalFovDeg).toBeCloseTo(61.3, 1)
  })

  it('narrows the view through the tangent, not in proportion to the zoom', () => {
    const view = fieldOfViewAt(8)

    expect(view.horizontalFovDeg).toBeCloseTo(8.47, 2)
    expect(view.horizontalFovDeg).toBeGreaterThan(61.3 / 8)
  })

  it('shrinks the width of the frame on the ground by the zoom', () => {
    const groundWidth = (zoom: number) =>
      2 * 300 * Math.tan(toRadians(fieldOfViewAt(zoom).horizontalFovDeg / 2))

    expect(groundWidth(1) / groundWidth(4)).toBeCloseTo(4, 6)
  })
})

describe('moveZoom', () => {
  it('doubles the zoom at most twice a second', () => {
    expect(moveZoom(1, 8, 0.5)).toBeCloseTo(2, 6)
    expect(moveZoom(4, 1, 0.5)).toBeCloseTo(2, 6)
  })

  it('stops exactly at the requested zoom', () => {
    expect(moveZoom(1.9, 2, 0.5)).toBe(2)
    expect(moveZoom(2.1, 2, 0.5)).toBe(2)
    expect(moveZoom(3, 3, 0.1)).toBe(3)
  })
})
