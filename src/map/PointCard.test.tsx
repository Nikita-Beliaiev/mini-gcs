import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { LatLon } from '../geo/geo'
import { useLocaleStore } from '../i18n/localeStore'
import { MAX_MARKS, type Mark } from '../marks/mark'
import { useMarksStore } from '../marks/marksStore'
import { cameraMessage, commandAckMessage, homeMessage, positionMessage } from '../test/messages'
import { renderWithStation } from '../test/render'
import { flatTerrain } from '../test/terrain'
import { useMapPointsStore } from './mapPointsStore'
import { PointCard } from './PointCard'

vi.mock('../marks/symbolImages', () => ({
  symbolImage: () => ({
    url: 'data:image/svg+xml,',
    width: 36,
    height: 36,
    anchor: { x: 18, y: 18 },
  }),
}))

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
  const rendered = renderWithStation(<PointCard canPointCamera />, { terrain: flatTerrain(330) })
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

  it('points the camera at the selected point', async () => {
    const { user, transport } = renderCard()
    act(() => {
      transport.setStatus('connected')
      transport.receive(cameraMessage())
    })
    select(POINT)

    await user.click(screen.getByRole('button', { name: 'Point camera here' }))
    expect(transport.sent[0]?.command).toEqual({ type: 'lookAtPoint', ...POINT, altitudeM: 0 })
    await act(async () => {
      transport.receive(
        commandAckMessage({
          commandId: transport.sent[0]?.commandId,
          command: 'lookAtPoint',
          accepted: true,
        }),
      )
      await Promise.resolve()
    })

    expect(screen.getByText('The camera keeps this point in view')).toBeInTheDocument()
  })

  it('adds a mark at the point with a name, an affiliation and a type', async () => {
    const { user } = renderCard()
    select(POINT)

    await user.click(screen.getByRole('button', { name: 'Add mark' }))
    const form = screen.getByRole('form', { name: 'New mark' })
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Mark 1')
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus()
    await user.clear(screen.getByRole('textbox', { name: 'Name' }))
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Ford')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Affiliation' }), 'Hostile')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Type' }), 'Vehicle')
    await user.click(screen.getByRole('button', { name: 'Save mark' }))

    expect(form).not.toBeInTheDocument()
    expect(useMarksStore.getState().marks).toEqual([
      expect.objectContaining({ ...POINT, name: 'Ford', affiliation: 'hostile', kind: 'vehicle' }),
    ])
    expect(screen.getByText('Mark “Ford” added')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add mark' })).toHaveFocus()
  })

  it('starts a new mark as an unknown ground track', async () => {
    const { user } = renderCard()
    select(POINT)

    await user.click(screen.getByRole('button', { name: 'Add mark' }))

    expect(screen.getByRole('combobox', { name: 'Affiliation' })).toHaveDisplayValue('Unknown')
    expect(screen.getByRole('combobox', { name: 'Type' })).toHaveDisplayValue('Ground track')
  })

  it('needs a name to save a mark', async () => {
    const { user } = renderCard()
    select(POINT)

    await user.click(screen.getByRole('button', { name: 'Add mark' }))
    await user.clear(screen.getByRole('textbox', { name: 'Name' }))
    await user.type(screen.getByRole('textbox', { name: 'Name' }), '   ')

    expect(screen.getByRole('button', { name: 'Save mark' })).toBeDisabled()
  })

  it('leaves the new mark with Escape', async () => {
    const { user } = renderCard()
    select(POINT)

    await user.click(screen.getByRole('button', { name: 'Add mark' }))
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('form', { name: 'New mark' })).not.toBeInTheDocument()
    expect(useMarksStore.getState().marks).toEqual([])
    expect(screen.getByRole('button', { name: 'Add mark' })).toHaveFocus()
  })

  it('closes the new mark when another point is selected', async () => {
    const { user } = renderCard()
    select(POINT)

    await user.click(screen.getByRole('button', { name: 'Add mark' }))
    select({ lat: 43.09, lon: 11.65 })

    expect(screen.queryByRole('form', { name: 'New mark' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add mark' })).toBeInTheDocument()
  })

  it('says when there is no room for another mark', async () => {
    const { user } = renderCard()
    const mark: Mark = {
      id: 'mark',
      name: 'Mark',
      ...POINT,
      affiliation: 'unknown',
      kind: 'ground',
      createdAt: '2026-11-16T10:00:00.000Z',
    }
    useMarksStore.setState({
      marks: Array.from({ length: MAX_MARKS }, (_, index) => ({ ...mark, id: String(index) })),
    })
    select(POINT)

    await user.click(screen.getByRole('button', { name: 'Add mark' }))

    expect(screen.queryByRole('form', { name: 'New mark' })).not.toBeInTheDocument()
    expect(screen.getByText('The station keeps at most 200 marks.')).toBeInTheDocument()
  })

  it('adds a mark in Ukrainian', async () => {
    useLocaleStore.getState().setLocale('uk')
    const { user } = renderCard()
    select(POINT)

    await user.click(screen.getByRole('button', { name: 'Додати мітку' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Належність' }), 'Свій')
    await user.click(screen.getByRole('button', { name: 'Зберегти мітку' }))

    expect(screen.getByText('Мітку «Мітка 1» додано')).toBeInTheDocument()
    expect(useMarksStore.getState().marks[0]?.affiliation).toBe('friend')
  })

  it('offers the camera only when the vehicle has one', () => {
    renderCard()

    select(POINT)

    expect(screen.queryByRole('button', { name: 'Point camera here' })).not.toBeInTheDocument()
  })
})
