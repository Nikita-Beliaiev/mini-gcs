import { describe, expect, it } from 'vitest'
import { movePointTo, removePointById, shiftPointBy, toDraftPoints } from './pointList'

const POINTS = toDraftPoints(
  [
    { lat: 1, lon: 1 },
    { lat: 2, lon: 2 },
    { lat: 3, lon: 3 },
  ],
  1,
)

function ids(points: { id: string }[]): string[] {
  return points.map((point) => point.id)
}

describe('toDraftPoints', () => {
  it('gives every position a sequential id', () => {
    expect(toDraftPoints([{ lat: 5, lon: 6 }], 7)).toEqual([{ id: 'point-7', lat: 5, lon: 6 }])
    expect(ids(POINTS)).toEqual(['point-1', 'point-2', 'point-3'])
  })
})

describe('movePointTo', () => {
  it('changes the position of one point only', () => {
    const moved = movePointTo(POINTS, 'point-2', { lat: 9, lon: 9 })

    expect(moved[1]).toEqual({ id: 'point-2', lat: 9, lon: 9 })
    expect(moved[0]).toBe(POINTS[0])
    expect(moved[2]).toBe(POINTS[2])
  })
})

describe('removePointById', () => {
  it('drops the point with the given id', () => {
    expect(ids(removePointById(POINTS, 'point-1'))).toEqual(['point-2', 'point-3'])
  })
})

describe('shiftPointBy', () => {
  it('moves a point up or down by one place', () => {
    expect(ids(shiftPointBy(POINTS, 'point-2', -1))).toEqual(['point-2', 'point-1', 'point-3'])
    expect(ids(shiftPointBy(POINTS, 'point-2', 1))).toEqual(['point-1', 'point-3', 'point-2'])
  })

  it('keeps the order at the edges and for unknown ids', () => {
    expect(ids(shiftPointBy(POINTS, 'point-1', -1))).toEqual(ids(POINTS))
    expect(ids(shiftPointBy(POINTS, 'point-3', 1))).toEqual(ids(POINTS))
    expect(ids(shiftPointBy(POINTS, 'missing', 1))).toEqual(ids(POINTS))
  })
})
