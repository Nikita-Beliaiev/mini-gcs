import { describe, expect, it } from 'vitest'
import { EMPTY_TELEMETRY_STATE } from '../telemetry/telemetryStore'
import { heartbeatMessage, systemStatusMessage } from '../test/messages'
import { evaluateAlerts, type AlertInputs } from './alertRules'

const EMPTY = EMPTY_TELEMETRY_STATE

function inputs(overrides: Partial<AlertInputs> = {}): AlertInputs {
  return {
    telemetry: {
      ...EMPTY,
      heartbeat: heartbeatMessage({ armed: true }),
      systemStatus: systemStatusMessage(),
    },
    connection: 'connected',
    msSinceHeartbeat: 500,
    ...overrides,
  }
}

function withStatus(overrides: Parameters<typeof systemStatusMessage>[0]): AlertInputs {
  const base = inputs()
  return {
    ...base,
    telemetry: { ...base.telemetry, systemStatus: systemStatusMessage(overrides) },
  }
}

function alertIds(alertInputs: AlertInputs): string[] {
  return evaluateAlerts(alertInputs).map((alert) => alert.id)
}

describe('evaluateAlerts', () => {
  it('stays quiet while everything is healthy', () => {
    expect(evaluateAlerts(inputs())).toEqual([])
  })

  it('raises nothing while not connected, even with alarming telemetry', () => {
    const alarming = withStatus({ batteryPercent: 5, fenceBreached: true })

    expect(evaluateAlerts({ ...alarming, connection: 'disconnected' })).toEqual([])
    expect(evaluateAlerts({ ...alarming, connection: 'connecting' })).toEqual([])
  })

  it('reports a lost link after 3 s without a heartbeat', () => {
    expect(alertIds(inputs({ msSinceHeartbeat: 3000 }))).toEqual([])
    expect(evaluateAlerts(inputs({ msSinceHeartbeat: 3001 }))).toEqual([
      { id: 'linkLost', severity: 'critical' },
    ])
  })

  it('reports a geofence breach', () => {
    expect(evaluateAlerts(withStatus({ fenceBreached: true }))).toEqual([
      { id: 'geofenceBreach', severity: 'critical' },
    ])
  })

  it('escalates the battery alert from warning to critical', () => {
    expect(evaluateAlerts(withStatus({ batteryPercent: 35 }))).toEqual([
      { id: 'batteryLow', severity: 'warning' },
    ])
    expect(evaluateAlerts(withStatus({ batteryPercent: 20 }))).toEqual([
      { id: 'batteryCritical', severity: 'critical' },
    ])
  })

  it('reports a lost GPS fix only while armed', () => {
    const noFix = withStatus({ gpsFix: 'none', gpsSatellites: 2 })
    const onGround = {
      ...noFix,
      telemetry: { ...noFix.telemetry, heartbeat: heartbeatMessage({ armed: false }) },
    }

    expect(alertIds(noFix)).toEqual(['gpsFixLost'])
    expect(alertIds(onGround)).toEqual([])
  })

  it('lists critical alerts before warnings', () => {
    const many = withStatus({ batteryPercent: 30, fenceBreached: true, gpsFix: '2d' })

    expect(alertIds({ ...many, msSinceHeartbeat: 5000 })).toEqual([
      'linkLost',
      'geofenceBreach',
      'batteryLow',
      'gpsFixLost',
    ])
  })
})
