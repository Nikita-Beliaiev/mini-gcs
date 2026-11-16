import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Mark } from './mark'
import { useMarksStore } from './marksStore'

const DRAFT = {
  lat: 43.07,
  lon: 11.68,
  name: '  Ford  ',
  affiliation: 'hostile',
  kind: 'vehicle',
} as const

afterEach(() => {
  vi.useRealTimers()
})

describe('useMarksStore', () => {
  it('adds a mark with its own id, a clean name and the time it was made', () => {
    vi.useFakeTimers({ now: new Date('2026-11-16T10:00:00Z'), toFake: ['Date'] })

    const mark = useMarksStore.getState().add(DRAFT)

    expect(mark).toEqual({
      ...DRAFT,
      id: expect.any(String) as string,
      name: 'Ford',
      createdAt: '2026-11-16T10:00:00.000Z',
    })
    expect(useMarksStore.getState().add(DRAFT).id).not.toBe(mark.id)
    expect(useMarksStore.getState().marks).toHaveLength(2)
  })

  it('renames a mark and keeps the old name when the new one is blank', () => {
    const { id } = useMarksStore.getState().add(DRAFT)

    useMarksStore.getState().rename(id, ' Bridge ')
    useMarksStore.getState().rename(id, '   ')

    expect(useMarksStore.getState().marks[0]?.name).toBe('Bridge')
  })

  it('removes a mark', () => {
    const first = useMarksStore.getState().add(DRAFT)
    const second = useMarksStore.getState().add(DRAFT)

    useMarksStore.getState().remove(first.id)

    expect(useMarksStore.getState().marks).toEqual([second])
  })

  it('imports marks over the ones with the same id', () => {
    const existing = useMarksStore.getState().add(DRAFT)
    const imported: Mark = { ...existing, name: 'Imported' }

    useMarksStore.getState().importMarks([imported])

    expect(useMarksStore.getState().marks).toEqual([imported])
  })
})
