import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ChartConfig } from './chartConfigs'
import { ChartsPanel } from './ChartsPanel'

vi.mock('./TimeSeriesChart', () => ({
  default: ({ config }: { config: ChartConfig }) => <figure>{config.title}</figure>,
}))

describe('ChartsPanel', () => {
  it('shows one chart per tracked value for the last minute', async () => {
    render(<ChartsPanel />)
    expect(await screen.findAllByRole('figure')).toHaveLength(3)

    const panel = screen.getByRole('region', { name: 'Last 60 seconds' })
    expect(panel).toHaveTextContent('Altitude')
    expect(panel).toHaveTextContent('Ground speed')
    expect(panel).toHaveTextContent('Battery and link')
  })
})
