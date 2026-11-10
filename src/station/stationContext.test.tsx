import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { heartbeatMessage, positionMessage } from '../test/messages'
import { createTestStation } from '../test/station'
import {
  GroundStationContext,
  useConnectionStatus,
  useGroundStation,
  useTelemetry,
} from './stationContext'

function setup() {
  const { station, transport } = createTestStation()
  function wrapper({ children }: { children: ReactNode }) {
    return <GroundStationContext value={station}>{children}</GroundStationContext>
  }
  return { station, transport, wrapper }
}

describe('useTelemetry', () => {
  it('returns the selected value and follows its changes', () => {
    const { transport, wrapper } = setup()
    const { result } = renderHook(() => useTelemetry((state) => state.position?.altitudeM), {
      wrapper,
    })

    expect(result.current).toBeUndefined()

    act(() => {
      transport.receive(positionMessage({ altitudeM: 12 }))
    })

    expect(result.current).toBe(12)
  })

  it('does not re-render when other telemetry changes', () => {
    const { transport, wrapper } = setup()
    let renderCount = 0
    renderHook(
      () => {
        renderCount += 1
        return useTelemetry((state) => state.heartbeat?.mode)
      },
      { wrapper },
    )
    act(() => {
      transport.receive(heartbeatMessage({ mode: 'AUTO' }))
    })
    const rendersAfterModeChange = renderCount

    act(() => {
      transport.receive(positionMessage())
      transport.receive(heartbeatMessage({ seq: 2, mode: 'AUTO' }))
    })

    expect(renderCount).toBe(rendersAfterModeChange)
  })
})

describe('useConnectionStatus', () => {
  it('follows the transport status', () => {
    const { station, wrapper } = setup()
    const { result } = renderHook(() => useConnectionStatus(), { wrapper })

    expect(result.current).toBe('disconnected')

    act(() => {
      station.connect()
    })

    expect(result.current).toBe('connecting')
  })
})

describe('useGroundStation', () => {
  it('fails loudly outside the ground station context', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    expect(() => renderHook(() => useGroundStation())).toThrow(/GroundStationContext/)

    vi.mocked(console.error).mockRestore()
  })
})
