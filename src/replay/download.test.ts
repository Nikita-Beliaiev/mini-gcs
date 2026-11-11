import { afterEach, describe, expect, it, vi } from 'vitest'
import { captureDownloads } from '../test/downloads'
import { downloadTextFile } from './download'

describe('downloadTextFile', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('saves the text under the given name and then releases it', async () => {
    const { downloads, revoked } = captureDownloads()

    downloadTextFile('{"a":1}', 'log.json')

    expect(downloads).toHaveLength(1)
    expect(downloads[0]?.fileName).toBe('log.json')
    expect(downloads[0]?.blob.type).toBe('application/json')
    expect(await downloads[0]?.blob.text()).toBe('{"a":1}')
    await vi.waitFor(() => {
      expect(revoked).toEqual(['blob:test/0'])
    })
  })
})
