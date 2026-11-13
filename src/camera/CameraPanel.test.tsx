import { act, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useLocaleStore } from '../i18n/localeStore'
import type { CameraMessage } from '../protocol/telemetry'
import { DEMO_HOME } from '../simulator/demoArea'
import { cameraMessage, homeMessage, positionMessage } from '../test/messages'
import { renderWithStation } from '../test/render'
import { flatTerrain } from '../test/terrain'
import { CameraPanel } from './CameraPanel'

vi.mock('./CameraVideo', () => ({
  default: ({ label }: { label: string }) => <p>{label} picture</p>,
}))

function renderPanel(camera?: Partial<CameraMessage>) {
  const rendered = renderWithStation(<CameraPanel />, { terrain: flatTerrain(300) })
  act(() => {
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
})
