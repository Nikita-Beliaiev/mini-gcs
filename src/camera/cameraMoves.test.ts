import { describe, expect, it } from 'vitest'
import { framePosition, moveCamera, nextZoom } from './cameraMoves'

describe('moveCamera', () => {
  const camera = { tiltDeg: -15, panDeg: 0, zoom: 1 }

  it.each([
    ['tiltUp', { tiltDeg: -5, panDeg: 0 }],
    ['tiltDown', { tiltDeg: -25, panDeg: 0 }],
    ['panLeft', { tiltDeg: -15, panDeg: -10 }],
    ['panRight', { tiltDeg: -15, panDeg: 10 }],
    ['lookDown', { tiltDeg: -90, panDeg: 0 }],
    ['lookAhead', { tiltDeg: -15, panDeg: 0 }],
  ] as const)('%s moves the camera in 10° steps', (move, expected) => {
    expect(moveCamera(camera, move)).toEqual(expected)
  })

  it('keeps the tilt between straight down and the horizon', () => {
    expect(moveCamera({ tiltDeg: -5, panDeg: 0, zoom: 1 }, 'tiltUp').tiltDeg).toBe(0)
    expect(moveCamera({ tiltDeg: -85, panDeg: 0, zoom: 1 }, 'tiltDown').tiltDeg).toBe(-90)
  })

  it('returns only the angles of a fuller camera report', () => {
    const report = { type: 'camera', tiltDeg: -15, panDeg: 0, zoom: 1, lookAt: null }

    expect(moveCamera(report, 'tiltUp')).toEqual({ tiltDeg: -5, panDeg: 0 })
    expect(moveCamera(report, 'panLeft')).toEqual({ tiltDeg: -15, panDeg: -10 })
  })

  it('wraps the pan around behind the vehicle', () => {
    expect(moveCamera({ tiltDeg: -15, panDeg: 175, zoom: 1 }, 'panRight').panDeg).toBe(-175)
    expect(moveCamera({ tiltDeg: -15, panDeg: -175, zoom: 1 }, 'panLeft').panDeg).toBe(175)
  })

  it('takes smaller steps when zoomed in, so a step stays the same share of the frame', () => {
    const zoomed = { tiltDeg: -15, panDeg: 0, zoom: 4 }

    expect(moveCamera(zoomed, 'tiltDown')).toEqual({ tiltDeg: -17.5, panDeg: 0 })
    expect(moveCamera(zoomed, 'panRight')).toEqual({ tiltDeg: -15, panDeg: 2.5 })
  })
})

describe('nextZoom', () => {
  it.each([
    [1, 2],
    [2, 4],
    [2.7, 4],
    [4, 8],
    [8, 8],
  ])('zooms in from ×%s to ×%s', (zoom, expected) => {
    expect(nextZoom(zoom, 'zoomIn')).toBe(expected)
  })

  it.each([
    [8, 4],
    [2.7, 2],
    [2, 1],
    [1, 1],
  ])('zooms out from ×%s to ×%s', (zoom, expected) => {
    expect(nextZoom(zoom, 'zoomOut')).toBe(expected)
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
