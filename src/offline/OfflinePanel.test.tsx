import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useLocaleStore } from '../i18n/localeStore'
import { fakeAreaStorage } from '../test/fakeAreaStorage'
import { useAppUpdateStore } from './appUpdate'
import type { AreaManifest } from './areaStorage'
import { useMapSourceStore } from './mapSourceStore'
import { NetworkBadge } from './NetworkBadge'
import { OfflinePanel } from './OfflinePanel'

const MANIFEST: AreaManifest = {
  builtAt: '2026-11-17',
  files: [
    { path: 'val-dorcia.pmtiles', bytes: 3_400_000 },
    { path: 'val-dorcia-terrain.pmtiles', bytes: 5_100_000 },
  ],
}

function serveArea(url: string): Response | null {
  if (url.endsWith('/area/manifest.json')) {
    return Response.json(MANIFEST)
  }
  return url.includes('/area/') ? new Response('bytes') : null
}

function panel(name = 'Offline map'): HTMLElement {
  return screen.getByRole('region', { name })
}

describe('OfflinePanel', () => {
  it('offers to save the area with its size', async () => {
    render(<OfflinePanel storage={fakeAreaStorage(serveArea)} />)

    expect(
      await screen.findByText(
        'The map and terrain of the demo area (8.5 MB) are not saved in this browser yet.',
      ),
    ).toBeInTheDocument()
    expect(panel()).toHaveTextContent(
      'The station opens without a network once it has been opened online.',
    )
  })

  it('saves the area and then offers to remove it', async () => {
    const user = userEvent.setup()
    const storage = fakeAreaStorage(serveArea)
    render(<OfflinePanel storage={storage} />)

    await user.click(await screen.findByRole('button', { name: 'Save the area for offline use' }))

    expect(
      await screen.findByText('The area is saved: 8.5 MB, map data of 2026-11-17.'),
    ).toBeInTheDocument()
    expect(storage.persisted).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Remove the saved area' }))
    expect(
      await screen.findByRole('button', { name: 'Save the area for offline use' }),
    ).toBeInTheDocument()
  })

  it('says when the area could not be saved', async () => {
    const user = userEvent.setup()
    const storage = fakeAreaStorage((url) =>
      url.includes('terrain') ? new Response('', { status: 503 }) : serveArea(url),
    )
    render(<OfflinePanel storage={storage} />)

    await user.click(await screen.findByRole('button', { name: 'Save the area for offline use' }))

    expect(
      await screen.findByText('The area could not be saved. Check the network and try again.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save the area for offline use' })).toBeEnabled()
  })

  it('says when the package cannot be reached', async () => {
    render(<OfflinePanel storage={fakeAreaStorage(() => null)} />)

    expect(await screen.findByText('The area package cannot be reached.')).toBeInTheDocument()
  })

  it('switches the map to the area package on request', async () => {
    const user = userEvent.setup()
    render(<OfflinePanel storage={fakeAreaStorage(serveArea)} />)
    const useArea = screen.getByRole('button', { name: 'Use the area map' })

    expect(useArea).toHaveAttribute('aria-pressed', 'false')
    await user.click(useArea)

    expect(useArea).toHaveAttribute('aria-pressed', 'true')
    expect(useMapSourceStore.getState().preferArea).toBe(true)
    await screen.findByText(/not saved in this browser yet/)
  })

  it('uses the area package without a network and says so', async () => {
    useMapSourceStore.setState({ isOnline: false })
    useAppUpdateStore.setState({ offlineReady: true })
    render(
      <>
        <NetworkBadge />
        <OfflinePanel storage={fakeAreaStorage(() => null)} />
      </>,
    )

    expect(screen.getByText('No network')).toBeInTheDocument()
    expect(panel()).toHaveTextContent('No network: the map and terrain come from the area package.')
    expect(panel()).toHaveTextContent('The station opens without a network.')
    expect(screen.getByRole('button', { name: 'Use the area map' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Use the area map' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await screen.findByText('The area package cannot be reached.')
  })

  it('speaks Ukrainian', async () => {
    useLocaleStore.getState().setLocale('uk')
    render(<OfflinePanel storage={fakeAreaStorage(serveArea)} />)

    expect(panel('Карта без мережі')).toBeInTheDocument()
    expect(
      await screen.findByText(
        'Карту й рельєф демо-району (8.5 МБ) ще не збережено в цьому браузері.',
      ),
    ).toBeInTheDocument()
    act(() => {
      useMapSourceStore.setState({ isOnline: false })
    })
    expect(
      screen.getByText('Немає мережі: карта й рельєф беруться з пакета району.'),
    ).toBeInTheDocument()
  })
})
