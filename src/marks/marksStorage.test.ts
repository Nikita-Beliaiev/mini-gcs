import { afterEach, describe, expect, it } from 'vitest'
import type { Mark } from './mark'
import { MARKS_STORAGE_KEY, parseSavedMarks, serializeMarks, startMarksSync } from './marksStorage'
import { useMarksStore } from './marksStore'

const MARK: Mark = {
  id: 'mark-1',
  name: 'Ford',
  lat: 43.07,
  lon: 11.68,
  affiliation: 'neutral',
  kind: 'ground',
  createdAt: '2026-11-16T10:00:00.000Z',
}

afterEach(() => {
  localStorage.clear()
})

describe('parseSavedMarks', () => {
  it('reads back what the station saved', () => {
    expect(parseSavedMarks(serializeMarks([MARK]))).toEqual([MARK])
  })

  it('starts empty without saved marks or with marks saved in another format', () => {
    expect(parseSavedMarks(null)).toEqual([])
    expect(parseSavedMarks('not json')).toEqual([])
    expect(parseSavedMarks(JSON.stringify({ version: 2, marks: [MARK] }))).toEqual([])
  })

  it('drops a damaged mark and keeps the rest', () => {
    const saved = JSON.stringify({ version: 1, marks: [{ ...MARK, lat: 120 }, MARK] })

    expect(parseSavedMarks(saved)).toEqual([MARK])
  })
})

describe('startMarksSync', () => {
  it('loads the saved marks and saves every change', () => {
    localStorage.setItem(MARKS_STORAGE_KEY, serializeMarks([MARK]))

    const stop = startMarksSync()
    expect(useMarksStore.getState().marks).toEqual([MARK])

    useMarksStore.getState().rename(MARK.id, 'Bridge')
    stop()
    useMarksStore.getState().remove(MARK.id)

    expect(parseSavedMarks(localStorage.getItem(MARKS_STORAGE_KEY))).toEqual([
      { ...MARK, name: 'Bridge' },
    ])
  })
})
