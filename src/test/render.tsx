import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { GroundStationContext } from '../station/stationContext'
import { createTestStation } from './station'

export function renderWithStation(ui: ReactElement) {
  const { station, transport } = createTestStation()
  const result = render(<GroundStationContext value={station}>{ui}</GroundStationContext>)
  return { ...result, station, transport }
}
