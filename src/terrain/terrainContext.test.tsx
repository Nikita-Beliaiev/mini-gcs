import { act, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DEMO_HOME } from '../simulator/demoArea'
import { TerrainContext, useTerrain } from './terrainContext'
import { createTerrainSampler } from './terrainSampler'
import { TERRAIN_TILE_SIZE } from './terrarium'

function HomeElevation() {
  const elevation = useTerrain().elevationAt(DEMO_HOME)
  return <p>{elevation === null ? 'No terrain' : `${String(elevation)} m`}</p>
}

describe('useTerrain', () => {
  it('has no terrain without a provider', () => {
    render(<HomeElevation />)

    expect(screen.getByText('No terrain')).toBeInTheDocument()
  })

  it('shows the elevation once its tile arrives', async () => {
    let deliver: (heights: Float32Array) => void = () => undefined
    const terrain = createTerrainSampler({
      loadTile: () =>
        new Promise((resolve) => {
          deliver = resolve
        }),
    })
    render(
      <TerrainContext value={terrain}>
        <HomeElevation />
      </TerrainContext>,
    )
    expect(screen.getByText('No terrain')).toBeInTheDocument()

    await act(async () => {
      deliver(new Float32Array(TERRAIN_TILE_SIZE * TERRAIN_TILE_SIZE).fill(302))
      await Promise.resolve()
    })

    expect(screen.getByText('302 m')).toBeInTheDocument()
  })
})
