import { act, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  attitudeMessage,
  heartbeatMessage,
  positionMessage,
  systemStatusMessage,
} from '../test/messages'
import { renderWithStation } from '../test/render'
import { TelemetryPanel } from './TelemetryPanel'

const LABELS = [
  'Flight mode',
  'Arming',
  'Altitude',
  'Ground speed',
  'Heading',
  'Roll',
  'Pitch',
  'Battery',
  'GPS',
  'Link quality',
]

function readout(label: string): HTMLElement {
  return screen.getByRole('definition', { name: label })
}

describe('TelemetryPanel', () => {
  it('lists every readout with an empty value before telemetry arrives', () => {
    renderWithStation(<TelemetryPanel />)

    const panel = screen.getByRole('complementary', { name: 'Telemetry' })
    const labels = within(panel)
      .getAllByRole('term')
      .map((term) => term.textContent)

    expect(labels).toEqual(LABELS)
    for (const label of LABELS) {
      expect(readout(label)).toHaveTextContent(/^—$/)
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
    expect(readout('Altitude')).toHaveTextContent('38.3 m')
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

    expect(readout('Altitude')).toHaveTextContent('12.5 m')
  })
})
