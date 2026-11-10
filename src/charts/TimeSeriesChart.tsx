import { useEffect, useRef } from 'react'
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'
import { useGroundStation } from '../station/stationContext'
import { CHART_WINDOW_MS } from './chartData'
import type { ChartConfig } from './chartConfigs'
import styles from './TimeSeriesChart.module.css'

const CHART_HEIGHT = 120
const AXIS_COLOR = '#7d8a9c'
const GRID_COLOR = '#243041'
const AXIS_FONT = '11px system-ui, sans-serif'

function chartOptions(config: ChartConfig, width: number): uPlot.Options {
  const axis = {
    stroke: AXIS_COLOR,
    font: AXIS_FONT,
    grid: { stroke: GRID_COLOR, width: 1 },
    ticks: { stroke: GRID_COLOR, width: 1 },
  }
  return {
    width,
    height: CHART_HEIGHT,
    legend: { show: false },
    cursor: { drag: { x: false, y: false } },
    scales: {
      x: { time: false, range: [-CHART_WINDOW_MS / 1000, 0] },
      y: { range: (_plot, _min, max) => config.yRange(max) },
    },
    axes: [
      { ...axis, values: (_plot, ticks) => ticks.map((tick) => `${String(tick)} s`) },
      { ...axis, size: 36 },
    ],
    series: [
      {},
      ...config.series.map((series) => ({
        label: series.label,
        stroke: series.color,
        width: 1.5,
        points: { show: false },
      })),
    ],
  }
}

interface TimeSeriesChartProps {
  config: ChartConfig
}

export default function TimeSeriesChart({ config }: TimeSeriesChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { telemetry } = useGroundStation()

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const plot = new uPlot(
      chartOptions(config, container.clientWidth),
      config.getData(telemetry),
      container,
    )
    let shownSource: unknown = telemetry.getSnapshot()[config.source]

    function update(): void {
      const source = telemetry.getSnapshot()[config.source]
      if (source === shownSource) {
        return
      }
      shownSource = source
      plot.setData(config.getData(telemetry))
    }

    const unsubscribe = telemetry.subscribe(update)
    const resizeObserver = new ResizeObserver(() => {
      plot.setSize({ width: container.clientWidth, height: CHART_HEIGHT })
    })
    resizeObserver.observe(container)

    return () => {
      unsubscribe()
      resizeObserver.disconnect()
      plot.destroy()
    }
  }, [telemetry, config])

  return (
    <figure className={styles.chart}>
      <figcaption className={styles.caption}>
        <span>
          {config.title}, {config.unit}
        </span>
        <span className={styles.legend}>
          {config.series.map((series) => (
            <span key={series.label} className={styles.legendItem}>
              <span className={styles.swatch} style={{ background: series.color }} />
              {series.label}
            </span>
          ))}
        </span>
      </figcaption>
      <div ref={containerRef} className={styles.plot} />
    </figure>
  )
}
