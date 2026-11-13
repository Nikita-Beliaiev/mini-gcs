import { describe, expect, it } from 'vitest'
import { framePosition, moveCamera } from './cameraMoves'

describe('moveCamera', () => {
  const angles = { tiltDeg: -15, panDeg: 0 }

  it.each([
    ['tiltUp', { tiltDeg: -5, panDeg: 0 }],
    ['tiltDown', { tiltDeg: -25, panDeg: 0 }],
    ['panLeft', { tiltDeg: -15, panDeg: -10 }],
    ['panRight', { tiltDeg: -15, panDeg: 10 }],
    ['lookDown', { tiltDeg: -90, panDeg: 0 }],
    ['lookAhead', { tiltDeg: -15, panDeg: 0 }],
  ] as const)('%s moves the camera in 10° steps', (move, expected) => {
    expect(moveCamera(angles, move)).toEqual(expected)
  })

  it('keeps the tilt between straight down and the horizon', () => {
    expect(moveCamera({ tiltDeg: -5, panDeg: 0 }, 'tiltUp').tiltDeg).toBe(0)
    expect(moveCamera({ tiltDeg: -85, panDeg: 0 }, 'tiltDown').tiltDeg).toBe(-90)
  })

  it('returns only the angles of a fuller camera report', () => {
    const report = { type: 'camera', tiltDeg: -15, panDeg: 0, lookAt: null }

    expect(moveCamera(report, 'tiltUp')).toEqual({ tiltDeg: -5, panDeg: 0 })
    expect(moveCamera(report, 'panLeft')).toEqual({ tiltDeg: -15, panDeg: -10 })
  })

  it('wraps the pan around behind the vehicle', () => {
    expect(moveCamera({ tiltDeg: -15, panDeg: 175 }, 'panRight').panDeg).toBe(-175)
    expect(moveCamera({ tiltDeg: -15, panDeg: -175 }, 'panLeft').panDeg).toBe(175)
  })
})

describe('framePosition', () => {
  it('maps a click in the frame to -1…1 with up positive', () => {
    expect(framePosition(160, 90, 320, 180)).toEqual({ screenX: 0, screenY: 0 })
    expect(framePosition(0, 0, 320, 180)).toEqual({ screenX: -1, screenY: 1 })
    expect(framePosition(320, 180, 320, 180)).toEqual({ screenX: 1, screenY: -1 })
  })

  it('stays inside the frame', () => {
    expect(framePosition(-5, 200, 320, 180)).toEqual({ screenX: -1, screenY: -1 })
  })
})
