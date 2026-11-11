import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ChartConfig } from './chartConfigs'
import { ChartsPanel } from './ChartsPanel'

vi.mock('./TimeSeriesChart', () => ({
  default: ({ config }: { config: ChartConfig }) => <figure>{config.id}</figure>,
}))

describe('ChartsPanel', () => {
  it('shows one chart per tracked value for the last minute', async () => {
    render(<ChartsPanel />)
    expect(await screen.findAllByRole('figure')).toHaveLength(3)

    const charts = within(screen.getByRole('region', { name: 'Last 60 seconds' })).getAllByRole(
      'figure',
    )
    expect(charts.map((chart) => chart.textContent)).toEqual([
      'altitude',
      'groundSpeed',
      'batteryAndLink',
    ])
  })
})
