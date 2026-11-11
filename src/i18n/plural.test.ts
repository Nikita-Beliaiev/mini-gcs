import { describe, expect, it } from 'vitest'
import { pluralize } from './plural'

const UK_POINTS = { one: 'точка', few: 'точки', many: 'точок', other: 'точки' }

describe('pluralize', () => {
  it('picks the English singular only for one', () => {
    const forms = { one: 'waypoint', other: 'waypoints' }

    expect([0, 1, 2, 5].map((count) => pluralize('en', count, forms))).toEqual([
      'waypoints',
      'waypoint',
      'waypoints',
      'waypoints',
    ])
  })

  it('follows the Ukrainian one, few and many forms', () => {
    expect(
      [1, 2, 4, 5, 11, 12, 21, 22, 25].map((count) => pluralize('uk', count, UK_POINTS)),
    ).toEqual(['точка', 'точки', 'точки', 'точок', 'точок', 'точок', 'точка', 'точки', 'точок'])
  })

  it('falls back to the other form when a form is missing', () => {
    expect(pluralize('uk', 5, { one: 'вершини', other: 'вершин' })).toBe('вершин')
  })
})
