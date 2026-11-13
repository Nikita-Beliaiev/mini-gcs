import { useEffect, useRef } from 'react'
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'
import { CHART_AXIS } from '../charts/chartTheme'
import type { Messages } from '../i18n/en'
import { useMessages } from '../i18n/localeStore'
import { formatDistance } from '../telemetry/format'
import type { RouteProfile } from '../terrain/routeProfile'
import { PROFILE_COLORS } from './profileColors'
import styles from './TerrainProfile.module.css'

const CHART_HEIGHT = 110
const RANGE_MARGIN_M = 10

function chartOptions(width: number, units: Messages['units']): uPlot.Options {
  return {
    width,
    height: CHART_HEIGHT,
    legend: { show: false },
    cursor: { show: false },
    scales: {
      x: { time: false },
      y: {
        range: (_plot, min, max) => [
          Math.floor(min - RANGE_MARGIN_M),
          Math.ceil(max + RANGE_MARGIN_M),
        ],
      },
    },
    axes: [
      {
        ...CHART_AXIS,
        values: (_plot, ticks) => ticks.map((tick) => formatDistance(tick, units)),
      },
      { ...CHART_AXIS, size: 44 },
    ],
    series: [
      {},
      {
        stroke: PROFILE_COLORS.ground,
        fill: PROFILE_COLORS.groundFill,
        width: 1.5,
        points: { show: false },
      },
      { stroke: PROFILE_COLORS.flight, width: 1.5, dash: [4, 4], points: { show: false } },
    ],
  }
}

function chartData({ samples, flightAltitudeM }: RouteProfile): uPlot.AlignedData {
  return [
    samples.map((sample) => sample.distanceM),
    samples.map((sample) => sample.groundM),
    samples.map(() => flightAltitudeM),
  ]
}

interface TerrainProfileChartProps {
  profile: RouteProfile
}

export default function TerrainProfileChart({ profile }: TerrainProfileChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const plotRef = useRef<uPlot | null>(null)
  const units = useMessages().units

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }
    const plot = new uPlot(chartOptions(container.clientWidth, units), [[], [], []], container)
    plotRef.current = plot
    const resizeObserver = new ResizeObserver(() => {
      plot.setSize({ width: container.clientWidth, height: CHART_HEIGHT })
    })
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      plot.destroy()
      plotRef.current = null
    }
  }, [units])

  useEffect(() => {
    plotRef.current?.setData(chartData(profile))
  }, [profile, units])

  return <div ref={containerRef} className={styles.plot} />
}
