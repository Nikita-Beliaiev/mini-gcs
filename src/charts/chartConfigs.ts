import type { Messages } from '../i18n/en'
import type { TelemetryState, TelemetryStore } from '../telemetry/telemetryStore'
import { chartWindow, type ChartData } from './chartData'

export interface ChartSeries {
  id: keyof Messages['charts']['series']
  color: string
}

export interface ChartConfig {
  id: keyof Messages['charts']['titles']
  unit: keyof Messages['units']
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
    id: 'altitude',
    unit: 'meters',
    source: 'position',
    series: [{ id: 'altitude', color: COLORS.altitude }],
    yRange: (dataMax) => [0, Math.max(50, Math.ceil(dataMax * 1.2))],
    getData: (telemetry) =>
      chartWindow(telemetry.getPositionHistory(), [(position) => position.altitudeM]),
  },
  {
    id: 'groundSpeed',
    unit: 'metersPerSecond',
    source: 'position',
    series: [{ id: 'groundSpeed', color: COLORS.speed }],
    yRange: (dataMax) => [0, Math.max(15, Math.ceil(dataMax * 1.2))],
    getData: (telemetry) =>
      chartWindow(telemetry.getPositionHistory(), [(position) => position.groundSpeedMs]),
  },
  {
    id: 'batteryAndLink',
    unit: 'percent',
    source: 'systemStatus',
    series: [
      { id: 'battery', color: COLORS.battery },
      { id: 'linkQuality', color: COLORS.link },
    ],
    yRange: () => [0, 100],
    getData: (telemetry) =>
      chartWindow(telemetry.getStatusHistory(), [
        (status) => status.batteryPercent,
        (status) => status.linkQualityPercent,
      ]),
  },
]
