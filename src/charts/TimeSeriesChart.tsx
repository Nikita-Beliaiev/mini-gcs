import { useEffect, useRef } from 'react'
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'
import { useMessages } from '../i18n/localeStore'
import { useGroundStation } from '../station/stationContext'
import { CHART_WINDOW_MS } from './chartData'
import { CHART_AXIS } from './chartTheme'
import type { ChartConfig } from './chartConfigs'
import styles from './TimeSeriesChart.module.css'

const CHART_HEIGHT = 120

function chartOptions(config: ChartConfig, width: number, secondsUnit: string): uPlot.Options {
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
      {
        ...CHART_AXIS,
        values: (_plot, ticks) => ticks.map((tick) => `${String(tick)} ${secondsUnit}`),
      },
      { ...CHART_AXIS, size: 36 },
    ],
    series: [
      {},
      ...config.series.map((series) => ({
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
  const messages = useMessages()
  const secondsUnit = messages.units.seconds
  const { telemetry } = useGroundStation()

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const plot = new uPlot(
      chartOptions(config, container.clientWidth, secondsUnit),
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
  }, [telemetry, config, secondsUnit])

  return (
    <figure className={styles.chart}>
      <figcaption className={styles.caption}>
        <span>
          {messages.charts.titles[config.id]}, {messages.units[config.unit]}
        </span>
        <span className={styles.legend}>
          {config.series.map((series) => (
            <span key={series.id} className={styles.legendItem}>
              <span className={styles.swatch} style={{ background: series.color }} />
              {messages.charts.series[series.id]}
            </span>
          ))}
        </span>
      </figcaption>
      <div ref={containerRef} className={styles.plot} />
    </figure>
  )
}
