import { act, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { attitudeMessage } from '../test/messages'
import { renderWithStation } from '../test/render'
import { horizonTransform } from './attitude'
import { AttitudeIndicator } from './AttitudeIndicator'

function horizon(): Element | null {
  return screen
    .getByRole('img', { name: 'Attitude indicator' })
    .querySelector('[data-part="horizon"]')
}

describe('AttitudeIndicator', () => {
  it('shows a level horizon before any attitude arrives', () => {
    renderWithStation(<AttitudeIndicator />)

    expect(horizon()).toHaveAttribute('transform', horizonTransform(0, 0))
  })

  it('moves the horizon with every attitude message', () => {
    const { transport } = renderWithStation(<AttitudeIndicator />)

    act(() => {
      transport.receive(attitudeMessage({ rollDeg: 12, pitchDeg: -8 }))
    })
    expect(horizon()).toHaveAttribute('transform', horizonTransform(12, -8))

    act(() => {
      transport.receive(attitudeMessage({ seq: 2, rollDeg: -5, pitchDeg: 3 }))
    })
    expect(horizon()).toHaveAttribute('transform', horizonTransform(-5, 3))
  })
})
