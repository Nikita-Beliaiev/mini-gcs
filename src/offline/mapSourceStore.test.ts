import { afterEach, describe, expect, it, vi } from 'vitest'
import { startNetworkWatch, useMapSourceStore, usesAreaPackage } from './mapSourceStore'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('usesAreaPackage', () => {
  it('reads the map from the area package when offline or when asked to', () => {
    expect(usesAreaPackage({ isOnline: true, preferArea: false })).toBe(false)
    expect(usesAreaPackage({ isOnline: false, preferArea: false })).toBe(true)
    expect(usesAreaPackage({ isOnline: true, preferArea: true })).toBe(true)
  })
})

describe('startNetworkWatch', () => {
  it('follows the browser going offline and back online', () => {
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)

    const stop = startNetworkWatch()
    expect(useMapSourceStore.getState().isOnline).toBe(false)

    onLine.mockReturnValue(true)
    window.dispatchEvent(new Event('online'))
    expect(useMapSourceStore.getState().isOnline).toBe(true)

    stop()
    onLine.mockReturnValue(false)
    window.dispatchEvent(new Event('offline'))
    expect(useMapSourceStore.getState().isOnline).toBe(true)
  })
})
