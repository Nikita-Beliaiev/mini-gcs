import { describe, expect, it } from 'vitest'
import { fakeAreaStorage } from '../test/fakeAreaStorage'
import { AREA_CACHE } from './areaCache'
import { areaBytes, readAreaStatus, removeArea, saveArea, type AreaManifest } from './areaStorage'

const MANIFEST: AreaManifest = {
  builtAt: '2026-11-17',
  files: [
    { path: 'val-dorcia.pmtiles', bytes: 3000 },
    { path: 'fonts/Noto Sans Regular/0-255.pbf', bytes: 200 },
  ],
}

function serveArea(url: string): Response | null {
  if (url.endsWith('/area/manifest.json')) {
    return Response.json(MANIFEST)
  }
  return url.includes('/area/') ? new Response('tile bytes') : null
}

describe('areaStorage', () => {
  it('adds up the size of the package', () => {
    expect(areaBytes(MANIFEST)).toBe(3200)
  })

  it('offers the package while it is not saved yet', async () => {
    const storage = fakeAreaStorage(serveArea)

    expect(await readAreaStatus(storage)).toEqual({ kind: 'notSaved', manifest: MANIFEST })
  })

  it('says when the package cannot be reached', async () => {
    const storage = fakeAreaStorage(() => null)

    expect(await readAreaStatus(storage)).toEqual({ kind: 'unavailable' })
  })

  it('saves every file and the manifest, reports progress and asks to keep the data', async () => {
    const storage = fakeAreaStorage(serveArea)
    const progress: number[] = []

    await saveArea(MANIFEST, (bytes) => progress.push(bytes), storage)

    expect(progress).toEqual([3000, 3200])
    expect(storage.persisted).toBe(true)
    expect(storage.stored(AREA_CACHE)).toEqual([
      expect.stringMatching(/\/area\/val-dorcia\.pmtiles$/),
      expect.stringMatching(/\/area\/fonts\/Noto%20Sans%20Regular\/0-255\.pbf$/),
      expect.stringMatching(/\/area\/manifest\.json$/),
    ])
  })

  it('knows the area is saved without asking the network', async () => {
    const storage = fakeAreaStorage(serveArea)
    await saveArea(MANIFEST, () => undefined, storage)
    const requestsBefore = storage.requests.length

    expect(await readAreaStatus(storage)).toEqual({ kind: 'saved', manifest: MANIFEST })
    expect(storage.requests).toHaveLength(requestsBefore)
  })

  it('stops when a file cannot be downloaded', async () => {
    const storage = fakeAreaStorage((url) =>
      url.includes('fonts') ? new Response('missing', { status: 404 }) : serveArea(url),
    )

    await expect(saveArea(MANIFEST, () => undefined, storage)).rejects.toThrow(/HTTP 404/)
    expect((await readAreaStatus(storage)).kind).toBe('notSaved')
  })

  it('removes the saved area', async () => {
    const storage = fakeAreaStorage(serveArea)
    await saveArea(MANIFEST, () => undefined, storage)

    await removeArea(storage)

    expect(storage.stored(AREA_CACHE)).toEqual([])
    expect((await readAreaStatus(storage)).kind).toBe('notSaved')
  })
})
