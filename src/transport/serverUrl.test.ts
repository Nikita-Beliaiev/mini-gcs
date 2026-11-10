import { describe, expect, it } from 'vitest'
import { simulatorServerUrl } from './serverUrl'

describe('simulatorServerUrl', () => {
  it('uses the in-browser simulator without a server parameter', () => {
    expect(simulatorServerUrl('')).toBeNull()
    expect(simulatorServerUrl('?other=1')).toBeNull()
  })

  it('reads a WebSocket address from the server parameter', () => {
    expect(simulatorServerUrl('?server=ws://127.0.0.1:8787')).toBe('ws://127.0.0.1:8787/')
    expect(simulatorServerUrl('?server=wss://sim.example.com/live')).toBe(
      'wss://sim.example.com/live',
    )
  })

  it('ignores addresses that are not WebSockets', () => {
    expect(simulatorServerUrl('?server=https://example.com')).toBeNull()
    expect(simulatorServerUrl('?server=javascript:alert(1)')).toBeNull()
    expect(simulatorServerUrl('?server=not a url')).toBeNull()
  })
})
