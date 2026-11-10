import type { TelemetryState } from '../telemetry/telemetryStore'

export function describeVehicleMission(state: TelemetryState): string {
  const { mission, missionCurrent, heartbeat } = state
  if (!mission) {
    return 'Waiting for the vehicle mission'
  }

  const count = mission.waypoints.length
  const summary = `Vehicle mission ${String(mission.missionId)}: ${String(count)} ${count === 1 ? 'waypoint' : 'waypoints'}`
  const isFlyingThisMission =
    heartbeat?.mode === 'AUTO' && missionCurrent?.missionId === mission.missionId
  if (!isFlyingThisMission) {
    return summary
  }
  return `${summary}, flying to WP ${String(missionCurrent.waypointIndex + 1)}`
}
