import { describe, expect, it } from 'vitest'
import { positionMessage, systemStatusMessage } from '../test/messages'
import { telemetryStoreWithoutFrames } from '../test/station'
import { CHARTS, type ChartConfig } from './chartConfigs'

function chart(id: ChartConfig['id']): ChartConfig {
  const config = CHARTS.find((candidate) => candidate.id === id)
  if (!config) {
    throw new Error(`No chart called ${id}`)
  }
  return config
}

function storeWithHistory() {
  const telemetry = telemetryStoreWithoutFrames()
  telemetry.push(positionMessage({ timeMs: 1000, altitudeM: 10, groundSpeedMs: 4 }))
  telemetry.push(positionMessage({ timeMs: 2000, altitudeM: 20, groundSpeedMs: 8 }))
  telemetry.push(systemStatusMessage({ timeMs: 2000, batteryPercent: 90, linkQualityPercent: 97 }))
  return telemetry
}

describe('CHARTS', () => {
  it('charts altitude and ground speed from the position history', () => {
    const telemetry = storeWithHistory()

    expect(chart('altitude').getData(telemetry)).toEqual([
      [-1, 0],
      [10, 20],
    ])
    expect(chart('groundSpeed').getData(telemetry)).toEqual([
      [-1, 0],
      [4, 8],
    ])
  })

  it('charts battery and link quality from the status history', () => {
    expect(chart('batteryAndLink').getData(storeWithHistory())).toEqual([[0], [90], [97]])
  })

  it('keeps percentages on a fixed scale and grows the others with the data', () => {
    expect(chart('batteryAndLink').yRange(40)).toEqual([0, 100])
    expect(chart('altitude').yRange(10)).toEqual([0, 50])
    expect(chart('altitude').yRange(100)).toEqual([0, 120])
  })
})
