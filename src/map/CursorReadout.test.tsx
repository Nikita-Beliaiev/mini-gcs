import { act, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useLocaleStore } from '../i18n/localeStore'
import { DEMO_HOME } from '../simulator/demoArea'
import { renderWithStation } from '../test/render'
import { flatTerrain } from '../test/terrain'
import { CursorReadout } from './CursorReadout'
import { useMapPointsStore } from './mapPointsStore'

function pointAt(point: typeof DEMO_HOME | null): void {
  act(() => {
    useMapPointsStore.getState().setCursor(point)
  })
}

describe('CursorReadout', () => {
  it('shows nothing while the cursor is off the map', () => {
    renderWithStation(<CursorReadout />)

    expect(screen.queryByRole('group', { name: 'Cursor position' })).not.toBeInTheDocument()
  })

  it('shows the coordinates, MGRS and ground elevation under the cursor', () => {
    renderWithStation(<CursorReadout />, { terrain: flatTerrain(302.4) })

    pointAt(DEMO_HOME)

    const readout = screen.getByRole('group', { name: 'Cursor position' })
    expect(readout).toHaveTextContent('43.09500, 11.64500')
    expect(readout).toHaveTextContent('32T QN 15262 74760')
    expect(readout).toHaveTextContent('Elevation 302 m')
  })

  it('leaves the elevation empty without terrain and hides when the cursor leaves', () => {
    renderWithStation(<CursorReadout />)

    pointAt(DEMO_HOME)
    expect(screen.getByRole('group', { name: 'Cursor position' })).toHaveTextContent('Elevation —')

    pointAt(null)
    expect(screen.queryByRole('group', { name: 'Cursor position' })).not.toBeInTheDocument()
  })

  it('speaks Ukrainian', () => {
    useLocaleStore.getState().setLocale('uk')
    renderWithStation(<CursorReadout />, { terrain: flatTerrain(302) })

    pointAt(DEMO_HOME)

    expect(screen.getByRole('group', { name: 'Положення курсора' })).toHaveTextContent(
      'Висота рельєфу 302 м',
    )
  })
})
