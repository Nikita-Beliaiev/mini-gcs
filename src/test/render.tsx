import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { GroundStationContext } from '../station/stationContext'
import { TerrainContext } from '../terrain/terrainContext'
import { NO_TERRAIN, type TerrainSampler } from '../terrain/terrainSampler'
import { createTestStation } from './station'

interface RenderOptions {
  terrain?: TerrainSampler
}

export function renderWithStation(ui: ReactElement, { terrain = NO_TERRAIN }: RenderOptions = {}) {
  const { station, transport } = createTestStation()
  const result = render(
    <TerrainContext value={terrain}>
      <GroundStationContext value={station}>{ui}</GroundStationContext>
    </TerrainContext>,
  )
  return { ...result, station, transport }
}
