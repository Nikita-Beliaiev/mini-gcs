import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useLocaleStore } from '../i18n/localeStore'
import { useMapPointsStore } from '../map/mapPointsStore'
import { captureDownloads } from '../test/downloads'
import { MAX_MARKS, type Mark } from './mark'
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

const ALPHA_COT =
  '<event uid="alpha" type="a-f-G-U-C-I" time="2026-11-16T09:30:00Z"><point lat="43.1" lon="11.65"/><detail><contact callsign="Alpha"/></detail></event>'

afterEach(() => {
  vi.restoreAllMocks()
})

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

  it('downloads the marks as GeoJSON', async () => {
    const { downloads } = captureDownloads()
    const { user } = renderPanel()

    await user.click(screen.getByRole('button', { name: 'Download GeoJSON' }))

    const download = downloads[0]
    expect(download?.fileName).toMatch(/^mini-gcs-marks-.+\.geojson$/)
    const geoJson = JSON.parse((await download?.blob.text()) ?? '') as { features: unknown[] }
    expect(geoJson.features).toHaveLength(2)
  })

  it('offers no GeoJSON without marks', () => {
    renderPanel([])

    expect(screen.getByRole('button', { name: 'Download GeoJSON' })).toBeDisabled()
  })

  it('downloads one mark as a Cursor on Target event', async () => {
    const { downloads } = captureDownloads()
    const { user } = renderPanel()

    await user.click(screen.getByRole('button', { name: 'Download Ford as Cursor on Target' }))

    expect(downloads[0]?.fileName).toBe('Ford.cot')
    expect(await downloads[0]?.blob.text()).toContain('type="a-h-G-E-V"')
  })

  it('imports marks from a CoT file', async () => {
    const { user } = renderPanel()

    await user.upload(screen.getByLabelText('Import marks'), new File([ALPHA_COT], 'alpha.cot'))

    expect(await screen.findByText('Imported 1 mark.')).toBeInTheDocument()
    expect(row('Alpha')).toHaveTextContent('Infantry (friend)')
    expect(useMarksStore.getState().marks).toHaveLength(3)
  })

  it('says why a file could not be imported', async () => {
    const { user } = renderPanel()

    await user.upload(screen.getByLabelText('Import marks'), new File(['{}'], 'notes.geojson'))

    expect(await screen.findByText('notes.geojson: The file is not GeoJSON.')).toBeInTheDocument()
    expect(useMarksStore.getState().marks).toEqual([FORD, MILL])
  })

  it('imports nothing when the marks would not fit', async () => {
    const { user } = renderPanel(
      Array.from({ length: MAX_MARKS }, (_, index) => ({ ...FORD, id: String(index) })),
    )

    await user.upload(screen.getByLabelText('Import marks'), new File([ALPHA_COT], 'alpha.cot'))

    expect(
      await screen.findByText('alpha.cot: The station keeps at most 200 marks.'),
    ).toBeInTheDocument()
    expect(useMarksStore.getState().marks).toHaveLength(MAX_MARKS)
  })

  it('speaks Ukrainian', () => {
    useLocaleStore.getState().setLocale('uk')
    renderPanel()

    expect(panel('Мітки')).toBeInTheDocument()
    expect(row('Ford')).toHaveTextContent('Транспортний засіб (противник)')
    expect(screen.getByRole('button', { name: 'Перейменувати «Mill»' })).toBeInTheDocument()
  })
})
