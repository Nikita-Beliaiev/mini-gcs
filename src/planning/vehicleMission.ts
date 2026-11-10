import type { TelemetryState } from '../telemetry/telemetryStore'

export function activeWaypointIndex(state: TelemetryState): number | null {
  const { mission, missionCurrent, heartbeat } = state
  const isFlyingThisMission =
    heartbeat?.mode === 'AUTO' &&
    mission !== null &&
    missionCurrent?.missionId === mission.missionId
  return isFlyingThisMission ? missionCurrent.waypointIndex : null
}

export function describeVehicleMission(state: TelemetryState): string {
  const { mission } = state
  if (!mission) {
    return 'Waiting for the vehicle mission'
  }

  const count = mission.waypoints.length
  const summary = `Vehicle mission ${String(mission.missionId)}: ${String(count)} ${count === 1 ? 'waypoint' : 'waypoints'}`
  const activeIndex = activeWaypointIndex(state)
  if (activeIndex === null) {
    return summary
  }
  return `${summary}, flying to WP ${String(activeIndex + 1)}`
}
