import type { TelemetryState, TelemetryStore } from '../telemetry/telemetryStore'
import { chartWindow, type ChartData } from './chartData'

export interface ChartSeries {
  label: string
  color: string
}

export interface ChartConfig {
  title: string
  unit: string
  source: keyof Pick<TelemetryState, 'position' | 'systemStatus'>
  series: readonly ChartSeries[]
  yRange: (dataMax: number) => [number, number]
  getData: (telemetry: TelemetryStore) => ChartData
}

const COLORS = {
  altitude: '#38bdf8',
  speed: '#c084fc',
  battery: '#fbbf24',
  link: '#34d399',
}

export const CHARTS: readonly ChartConfig[] = [
  {
    title: 'Altitude',
    unit: 'm',
    source: 'position',
    series: [{ label: 'Altitude', color: COLORS.altitude }],
    yRange: (dataMax) => [0, Math.max(50, Math.ceil(dataMax * 1.2))],
    getData: (telemetry) =>
      chartWindow(telemetry.getPositionHistory(), [(position) => position.altitudeM]),
  },
  {
    title: 'Ground speed',
    unit: 'm/s',
    source: 'position',
    series: [{ label: 'Ground speed', color: COLORS.speed }],
    yRange: (dataMax) => [0, Math.max(15, Math.ceil(dataMax * 1.2))],
    getData: (telemetry) =>
      chartWindow(telemetry.getPositionHistory(), [(position) => position.groundSpeedMs]),
  },
  {
    title: 'Battery and link',
    unit: '%',
    source: 'systemStatus',
    series: [
      { label: 'Battery', color: COLORS.battery },
      { label: 'Link quality', color: COLORS.link },
    ],
    yRange: () => [0, 100],
    getData: (telemetry) =>
      chartWindow(telemetry.getStatusHistory(), [
        (status) => status.batteryPercent,
        (status) => status.linkQualityPercent,
      ]),
  },
]
