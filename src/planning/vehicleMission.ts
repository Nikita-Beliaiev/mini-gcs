import type { Messages } from '../i18n/en'
import type { TelemetryState } from '../telemetry/telemetryStore'

export function activeWaypointIndex(state: TelemetryState): number | null {
  const { mission, missionCurrent, heartbeat } = state
  const isFlyingThisMission =
    heartbeat?.mode === 'AUTO' &&
    mission !== null &&
    missionCurrent?.missionId === mission.missionId
  return isFlyingThisMission ? missionCurrent.waypointIndex : null
}

export function describeVehicleMission(state: TelemetryState, messages: Messages): string {
  const text = messages.planning.mission
  const { mission } = state
  if (!mission) {
    return text.waitingForVehicle
  }

  const activeIndex = activeWaypointIndex(state)
  return text.onVehicle(
    mission.missionId,
    mission.waypoints.length,
    activeIndex === null ? null : activeIndex + 1,
  )
}
