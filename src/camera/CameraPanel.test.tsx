import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { useLocaleStore } from '../i18n/localeStore'
import type { CameraMessage } from '../protocol/telemetry'
import { bearingDegrees, distanceMeters } from '../geo/geo'
import { useMapPointsStore } from '../map/mapPointsStore'
import { DEMO_HOME } from '../simulator/demoArea'
import { cameraMessage, commandAckMessage, homeMessage, positionMessage } from '../test/messages'
import { renderWithStation } from '../test/render'
import { flatTerrain } from '../test/terrain'
import { CameraPanel } from './CameraPanel'

vi.mock('./CameraVideo', () => ({
  default: ({ label }: { label: string }) => <p>{label} picture</p>,
}))

function renderPanel(camera?: Partial<CameraMessage>, canControl = true) {
  const rendered = renderWithStation(<CameraPanel canControl={canControl} />, {
    terrain: flatTerrain(300),
  })
  act(() => {
    rendered.transport.setStatus('connected')
    rendered.transport.receive(homeMessage(DEMO_HOME))
    rendered.transport.receive(positionMessage({ ...DEMO_HOME, altitudeM: 80, headingDeg: 0 }))
    if (camera) {
      rendered.transport.receive(cameraMessage(camera))
    }
  })
  return rendered
}

function panel(name = 'Camera'): HTMLElement {
  return screen.getByRole('region', { name })
}

describe('CameraPanel', () => {
  it('says when the vehicle sends no camera data', () => {
    renderPanel()

    expect(panel()).toHaveTextContent('No camera data from this vehicle.')
  })

  it('shows the camera view with its angles, the frame centre and its range', async () => {
    renderPanel({ tiltDeg: -35, panDeg: 10 })

    expect(await screen.findByText('Camera view picture')).toBeInTheDocument()
    expect(panel()).toHaveTextContent('Tilt -35° Pan +10°')
    expect(panel()).toHaveTextContent(/32T QN \d{5} \d{5} · Range 139 m/)
    expect(panel()).toHaveTextContent('Synthetic view')
    expect(panel()).not.toHaveTextContent('Tracking a point')
  })

  it('says when the camera tracks a point', () => {
    renderPanel({ lookAt: DEMO_HOME })

    expect(panel()).toHaveTextContent('Tracking a point')
  })

  it('says when the frame centre is above the horizon', () => {
    renderPanel({ tiltDeg: 0 })

    expect(panel()).toHaveTextContent('Frame centre above the horizon')
  })

  it('speaks Ukrainian', () => {
    useLocaleStore.getState().setLocale('uk')
    renderPanel({ tiltDeg: -35, panDeg: 10 })

    expect(panel('Камера')).toHaveTextContent('Нахил -35° Поворот +10°')
    expect(panel('Камера')).toHaveTextContent(/Дальність 139 м/)
  })

  it('tilts and pans the camera in steps from its current angles', async () => {
    const user = userEvent.setup()
    const { transport } = renderPanel({ tiltDeg: -35, panDeg: 10 })

    await user.click(screen.getByRole('button', { name: 'Tilt down' }))
    await user.click(screen.getByRole('button', { name: 'Pan left' }))
    await user.click(screen.getByRole('button', { name: 'Look down' }))

    expect(transport.sent.map((envelope) => envelope.command)).toEqual([
      { type: 'pointCamera', tiltDeg: -45, panDeg: 10 },
      { type: 'pointCamera', tiltDeg: -35, panDeg: 0 },
      { type: 'pointCamera', tiltDeg: -90, panDeg: 0 },
    ])
  })

  it('says why the vehicle refused to move the camera', async () => {
    const user = userEvent.setup()
    const { transport } = renderPanel({ tiltDeg: -35 })

    await user.click(screen.getByRole('button', { name: 'Tilt up' }))
    await act(async () => {
      transport.receive(
        commandAckMessage({
          commandId: transport.sent[0]?.commandId,
          command: 'pointCamera',
          accepted: false,
          reason: 'The bridge does not control a camera yet',
        }),
      )
      await Promise.resolve()
    })

    expect(panel()).toHaveTextContent('Rejected: The bridge does not control a camera yet')
  })

  it('offers no controls in a replay', () => {
    renderPanel({ tiltDeg: -35 }, false)

    expect(screen.queryByRole('group', { name: 'Camera controls' })).not.toBeInTheDocument()
  })

  it('picks the point under the crosshair with the keyboard', async () => {
    const user = userEvent.setup()
    renderPanel({ tiltDeg: -35, panDeg: 10 })

    screen.getByRole('button', { name: 'Pick a point in the camera view' }).focus()
    await user.keyboard('{Enter}')

    const selected = useMapPointsStore.getState().selected ?? DEMO_HOME
    expect(distanceMeters(DEMO_HOME, selected)).toBeCloseTo(80 / Math.tan((35 * Math.PI) / 180), 0)
    expect(bearingDegrees(DEMO_HOME, selected)).toBeCloseTo(10, 0)
  })
})
