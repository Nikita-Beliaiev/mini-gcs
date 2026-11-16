import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { useLocaleStore } from '../i18n/localeStore'
import { useMapPointsStore } from '../map/mapPointsStore'
import type { Mark } from './mark'
import { MarksPanel } from './MarksPanel'
import { useMarksStore } from './marksStore'

vi.mock('./symbolImages', () => ({
  symbolImage: () => ({
    url: 'data:image/svg+xml,',
    width: 36,
    height: 36,
    anchor: { x: 18, y: 18 },
  }),
}))

const FORD: Mark = {
  id: 'ford',
  name: 'Ford',
  lat: 43.0938,
  lon: 11.6398,
  affiliation: 'hostile',
  kind: 'vehicle',
  createdAt: '2026-11-16T10:05:00.000Z',
}

const MILL: Mark = { ...FORD, id: 'mill', name: 'Mill', affiliation: 'neutral', kind: 'ground' }

function renderPanel(marks: Mark[] = [FORD, MILL]) {
  useMarksStore.setState({ marks })
  const user = userEvent.setup()
  render(<MarksPanel />)
  return { user }
}

function panel(name = 'Marks'): HTMLElement {
  return screen.getByRole('region', { name })
}

function row(name: string): HTMLElement {
  const item = screen
    .getAllByRole('listitem')
    .find((element) => within(element).queryByText(name) !== null)
  if (!item) {
    throw new Error(`No mark named ${name}`)
  }
  return item
}

describe('MarksPanel', () => {
  it('says when there are no marks yet', () => {
    renderPanel([])

    expect(panel()).toHaveTextContent('No marks yet.')
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('lists every mark with its symbol, MGRS reference and time', () => {
    renderPanel()

    expect(within(panel()).getAllByRole('listitem')).toHaveLength(2)
    expect(row('Ford')).toHaveTextContent('Vehicle (hostile)')
    expect(row('Ford')).toHaveTextContent(/32T QN \d{5} \d{5} 2026-11-16 10:05 UTC/)
    expect(row('Mill')).toHaveTextContent('Ground track (neutral)')
  })

  it('shows a mark on the map', async () => {
    const { user } = renderPanel()

    await user.click(screen.getByRole('button', { name: 'Show Ford on the map' }))

    const { selected, centerRequest } = useMapPointsStore.getState()
    expect(selected).toEqual({ lat: FORD.lat, lon: FORD.lon })
    expect(centerRequest?.point).toEqual({ lat: FORD.lat, lon: FORD.lon })
  })

  it('renames a mark', async () => {
    const { user } = renderPanel()

    await user.click(screen.getByRole('button', { name: 'Rename Ford' }))
    const name = screen.getByRole('textbox', { name: 'New name' })
    expect(name).toHaveValue('Ford')
    await user.clear(name)
    await user.type(name, 'Bridge{Enter}')

    expect(useMarksStore.getState().marks[0]?.name).toBe('Bridge')
    expect(screen.getByRole('button', { name: 'Rename Bridge' })).toHaveFocus()
  })

  it('keeps the name when renaming is cancelled or the new name is blank', async () => {
    const { user } = renderPanel()

    await user.click(screen.getByRole('button', { name: 'Rename Ford' }))
    await user.clear(screen.getByRole('textbox', { name: 'New name' }))
    expect(screen.getByRole('button', { name: 'Save name' })).toBeDisabled()
    await user.keyboard('{Escape}')

    expect(useMarksStore.getState().marks[0]?.name).toBe('Ford')
    expect(screen.getByRole('button', { name: 'Rename Ford' })).toHaveFocus()
  })

  it('removes a mark and says so', async () => {
    const { user } = renderPanel()

    await user.click(screen.getByRole('button', { name: 'Remove Ford' }))

    expect(useMarksStore.getState().marks).toEqual([MILL])
    expect(screen.getByText('Mark “Ford” removed')).toBeInTheDocument()
  })

  it('speaks Ukrainian', () => {
    useLocaleStore.getState().setLocale('uk')
    renderPanel()

    expect(panel('Мітки')).toBeInTheDocument()
    expect(row('Ford')).toHaveTextContent('Транспортний засіб (противник)')
    expect(screen.getByRole('button', { name: 'Перейменувати «Mill»' })).toBeInTheDocument()
  })
})
