import { act, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  attitudeMessage,
  heartbeatMessage,
  homeMessage,
  positionMessage,
  systemStatusMessage,
} from '../test/messages'
import { renderWithStation } from '../test/render'
import { fakeTerrain } from '../test/terrain'
import { TelemetryPanel } from './TelemetryPanel'

const LABELS = [
  'Flight mode',
  'Arming',
  'Above home',
  'Above ground',
  'Above sea level',
  'Ground speed',
  'Heading',
  'Roll',
  'Pitch',
  'Battery',
  'GPS',
  'Link quality',
]

function readout(label: string): HTMLElement {
  return screen.getByRole('group', { name: label })
}

describe('TelemetryPanel', () => {
  it('lists every readout with an empty value before telemetry arrives', () => {
    renderWithStation(<TelemetryPanel />)

    const panel = screen.getByRole('complementary', { name: 'Telemetry' })
    const readoutsInOrder = LABELS.map((label) => within(panel).getByRole('group', { name: label }))

    expect(within(panel).getAllByRole('group')).toEqual(readoutsInOrder)
    for (const label of LABELS) {
      expect(readout(label)).toHaveTextContent(/—$/)
    }
  })

  it('shows the latest telemetry with units', () => {
    const { transport } = renderWithStation(<TelemetryPanel />)

    act(() => {
      transport.receive(heartbeatMessage({ mode: 'RTL', armed: true }))
      transport.receive(attitudeMessage({ rollDeg: 12.4, pitchDeg: -9.6 }))
      transport.receive(
        positionMessage({ altitudeM: 38.27, groundSpeedMs: 11.94, headingDeg: 7.2 }),
      )
      transport.receive(
        systemStatusMessage({
          batteryPercent: 64.6,
          gpsFix: '3d',
          gpsSatellites: 15,
          linkQualityPercent: 91.2,
        }),
      )
    })

    expect(readout('Flight mode')).toHaveTextContent('RTL')
    expect(readout('Arming')).toHaveTextContent('Armed')
    expect(readout('Above home')).toHaveTextContent('38.3 m')
    expect(readout('Ground speed')).toHaveTextContent('11.9 m/s')
    expect(readout('Heading')).toHaveTextContent('007°')
    expect(readout('Roll')).toHaveTextContent('+12°')
    expect(readout('Pitch')).toHaveTextContent('-10°')
    expect(readout('Battery')).toHaveTextContent('65 %')
    expect(readout('GPS')).toHaveTextContent('3D · 15 sats')
    expect(readout('Link quality')).toHaveTextContent('91 %')
  })

  it('updates a readout when newer telemetry arrives', () => {
    const { transport } = renderWithStation(<TelemetryPanel />)

    act(() => {
      transport.receive(positionMessage({ altitudeM: 10 }))
    })
    act(() => {
      transport.receive(positionMessage({ seq: 2, altitudeM: 12.5 }))
    })

    expect(readout('Above home')).toHaveTextContent('12.5 m')
  })

  it('shows the altitude above the ground and above sea level from the terrain', () => {
    const home = homeMessage({ lat: 43.095, lon: 11.645 })
    const terrain = fakeTerrain((point) => (point.lat === home.lat ? 302 : 340))
    const { transport } = renderWithStation(<TelemetryPanel />, { terrain })

    act(() => {
      transport.receive(home)
      transport.receive(positionMessage({ lat: 43.09, lon: 11.65, altitudeM: 80 }))
    })

    expect(readout('Above home')).toHaveTextContent('80.0 m')
    expect(readout('Above sea level')).toHaveTextContent('382.0 m')
    expect(readout('Above ground')).toHaveTextContent('42.0 m')
  })

  it('leaves the terrain altitudes empty without terrain data', () => {
    const { transport } = renderWithStation(<TelemetryPanel />)

    act(() => {
      transport.receive(homeMessage())
      transport.receive(positionMessage({ altitudeM: 80 }))
    })

    expect(readout('Above home')).toHaveTextContent('80.0 m')
    expect(readout('Above sea level')).toHaveTextContent(/—$/)
    expect(readout('Above ground')).toHaveTextContent(/—$/)
  })
})
