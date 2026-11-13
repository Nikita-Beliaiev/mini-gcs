import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { LatLon } from '../geo/geo'
import { useLocaleStore } from '../i18n/localeStore'
import { homeMessage, positionMessage } from '../test/messages'
import { renderWithStation } from '../test/render'
import { flatTerrain } from '../test/terrain'
import { useMapPointsStore } from './mapPointsStore'
import { PointCard } from './PointCard'

const POINT = { lat: 43.1, lon: 11.645 }

function select(point: LatLon): void {
  act(() => {
    useMapPointsStore.getState().select(point)
  })
}

function detail(term: string): Element | null {
  return screen.getByText(term).nextElementSibling
}

function renderCard() {
  const user = userEvent.setup()
  const rendered = renderWithStation(<PointCard />, { terrain: flatTerrain(330) })
  act(() => {
    rendered.transport.receive(homeMessage({ lat: 43.095, lon: 11.645 }))
    rendered.transport.receive(positionMessage({ lat: 43.1, lon: 11.62 }))
  })
  return { user, ...rendered }
}

describe('PointCard', () => {
  it('shows nothing until a point is selected', () => {
    renderCard()

    expect(screen.queryByRole('region', { name: 'Selected point' })).not.toBeInTheDocument()
  })

  it('describes the selected point', () => {
    renderCard()

    select(POINT)

    expect(screen.getByRole('region', { name: 'Selected point' })).toBeInTheDocument()
    expect(detail('Coordinates')).toHaveTextContent('43.10000, 11.64500')
    expect(detail('MGRS')).toHaveTextContent(/^32T QN \d{5} \d{5}/)
    expect(detail('Elevation')).toHaveTextContent('330 m')
    expect(detail('From home')).toHaveTextContent('556 m, 000°')
    expect(detail('From vehicle')).toHaveTextContent('2.0 km, 090°')
  })

  it('copies the coordinates and the MGRS reference', async () => {
    const { user } = renderCard()
    select(POINT)

    await user.click(screen.getByRole('button', { name: 'Copy coordinates' }))
    expect(await navigator.clipboard.readText()).toBe('43.10000, 11.64500')
    expect(screen.getByText('Coordinates copied')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Copy MGRS' }))
    expect(await navigator.clipboard.readText()).toMatch(/^32T QN \d{5} \d{5}$/)
    expect(screen.getByText('MGRS copied')).toBeInTheDocument()
  })

  it('says when the clipboard refuses', async () => {
    const { user } = renderCard()
    select(POINT)
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'))

    await user.click(screen.getByRole('button', { name: 'Copy coordinates' }))

    expect(screen.getByText('Could not copy to the clipboard')).toBeInTheDocument()
  })

  it('forgets the copy message when another point is selected', async () => {
    const { user } = renderCard()
    select(POINT)
    await user.click(screen.getByRole('button', { name: 'Copy coordinates' }))

    select({ lat: 43.09, lon: 11.65 })

    expect(screen.queryByText('Coordinates copied')).not.toBeInTheDocument()
  })

  it('closes', async () => {
    const { user } = renderCard()
    select(POINT)

    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(screen.queryByRole('region', { name: 'Selected point' })).not.toBeInTheDocument()
    expect(useMapPointsStore.getState().selected).toBeNull()
  })

  it('speaks Ukrainian', () => {
    useLocaleStore.getState().setLocale('uk')
    renderCard()

    select(POINT)

    expect(screen.getByRole('region', { name: 'Вибрана точка' })).toBeInTheDocument()
    expect(detail('Від старту')).toHaveTextContent('556 м, 000°')
    expect(screen.getByRole('button', { name: 'Копіювати координати' })).toBeInTheDocument()
  })
})
