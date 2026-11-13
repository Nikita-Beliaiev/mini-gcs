import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { destinationPoint, distanceMeters, type LatLon } from '../geo/geo'
import { useLocaleStore } from '../i18n/localeStore'
import { DEMO_HOME } from '../simulator/demoArea'
import type { RouteProfile } from '../terrain/routeProfile'
import { renderWithStation } from '../test/render'
import { fakeTerrain, flatTerrain } from '../test/terrain'
import { TerrainProfile } from './TerrainProfile'

vi.mock('./TerrainProfileChart', () => ({
  default: ({ profile }: { profile: RouteProfile }) => (
    <p>Chart of {profile.samples.length} samples</p>
  ),
}))

const NORTH = destinationPoint(DEMO_HOME, 0, 500)
const NORTH_EAST = destinationPoint(NORTH, 90, 500)
const HILLTOP = destinationPoint(NORTH, 90, 260)

function hill(peakM: number) {
  return fakeTerrain(
    (point: LatLon) => 300 + Math.max(0, peakM - distanceMeters(point, HILLTOP) / 2),
  )
}

function renderProfile(terrain = flatTerrain(300)) {
  return renderWithStation(<TerrainProfile home={DEMO_HOME} waypoints={[NORTH, NORTH_EAST]} />, {
    terrain,
  })
}

describe('TerrainProfile', () => {
  it('waits for terrain data', () => {
    renderWithStation(<TerrainProfile home={DEMO_HOME} waypoints={[NORTH]} />)

    expect(
      screen.getByText('The terrain profile appears once terrain data has loaded.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('figure')).not.toBeInTheDocument()
  })

  it('draws the ground along the route and names the lowest clearance', async () => {
    renderProfile()

    const profile = screen.getByRole('figure', { name: 'Terrain profile' })
    expect(profile).toHaveTextContent('Ground')
    expect(profile).toHaveTextContent('Flight altitude')
    expect(await screen.findByText(/^Chart of \d+ samples$/)).toBeInTheDocument()
    expect(
      screen.getByText('Lowest clearance: 80 m above the ground, between home and WP 1.'),
    ).toBeInTheDocument()
  })

  it('warns when a leg passes less than 20 m above the ground', () => {
    renderProfile(hill(68))

    expect(
      screen.getByText(
        'Only 12 m above the ground between WP 1 and WP 2. The vehicle flies 80 m above home and does not follow the terrain.',
      ),
    ).toBeInTheDocument()
  })

  it('warns when the route runs into the ground', () => {
    renderProfile(hill(100))

    expect(
      screen.getByText(/^The route runs 20 m into the ground between WP 1 and WP 2\./),
    ).toBeInTheDocument()
  })

  it('speaks Ukrainian', () => {
    useLocaleStore.getState().setLocale('uk')
    renderProfile()

    expect(screen.getByRole('figure', { name: 'Профіль рельєфу' })).toBeInTheDocument()
    expect(
      screen.getByText('Найменший запас: 80 м над землею, між точкою старту і Т 1.'),
    ).toBeInTheDocument()
  })
})
