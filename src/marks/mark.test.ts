import { describe, expect, it } from 'vitest'
import { cleanMarkName, MAX_MARK_NAME_LENGTH, mergeMarks, type Mark } from './mark'

function mark(id: string, name = id): Mark {
  return {
    id,
    name,
    lat: 43.07,
    lon: 11.68,
    affiliation: 'unknown',
    kind: 'ground',
    createdAt: '2026-11-16T10:00:00.000Z',
  }
}

describe('cleanMarkName', () => {
  it('trims the name and cuts it to the longest allowed', () => {
    expect(cleanMarkName('  Ford  ')).toBe('Ford')
    expect(cleanMarkName('x'.repeat(60))).toHaveLength(MAX_MARK_NAME_LENGTH)
  })
})

describe('mergeMarks', () => {
  it('updates marks with the same id in place and appends new ones', () => {
    const merged = mergeMarks([mark('a'), mark('b')], [mark('b', 'Bridge'), mark('c')])

    expect(merged.map(({ id, name }) => `${id}:${name}`)).toEqual(['a:a', 'b:Bridge', 'c:c'])
  })

  it('keeps the last of incoming marks that share an id', () => {
    const merged = mergeMarks([], [mark('a', 'First'), mark('a', 'Second')])

    expect(merged.map(({ name }) => name)).toEqual(['Second'])
  })
})
