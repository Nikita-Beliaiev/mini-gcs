import { routeLengthMeters } from '../geo/geo'
import { useMessages } from '../i18n/localeStore'
import { validateMission, WAITING_FOR_HOME } from '../mission/missionRules'
import { describePlanIssue } from '../mission/planIssueText'
import { useConnectionStatus, useGroundStation, useTelemetry } from '../station/stationContext'
import { formatDistance } from '../telemetry/format'
import buttonStyles from '../ui/button.module.css'
import { classNames } from '../ui/classNames'
import styles from './PlanEditor.module.css'
import { usePlanningStore } from './planningStore'
import { DraftPointList } from './DraftPointList'
import { DrawOnMapButton } from './DrawOnMapButton'
import { describeUpload, uploadPlan } from './uploadPlan'
import { describeVehicleMission } from './vehicleMission'

export function MissionPanel() {
  const messages = useMessages()
  const text = messages.planning
  const station = useGroundStation()
  const isConnected = useConnectionStatus() === 'connected'
  const draft = usePlanningStore((state) => state.drafts.mission)
  const isDrawing = usePlanningStore((state) => state.editMode === 'mission')
  const upload = usePlanningStore((state) => state.uploads.mission)
  const replacePoints = usePlanningStore((state) => state.replacePoints)
  const clearPoints = usePlanningStore((state) => state.clearPoints)
  const home = useTelemetry((state) => state.home)
  const vehicleMission = useTelemetry((state) => state.mission)
  const vehicleGeofence = useTelemetry((state) => state.geofence?.polygon ?? null)
  const vehicleSummary = useTelemetry((state) => describeVehicleMission(state, messages))

  const issues = home ? validateMission(draft, home, vehicleGeofence) : [WAITING_FOR_HOME]
  const generalIssues =
    draft.length === 0 ? [] : issues.filter((issue) => issue.pointIndex === null)
  const canUpload = isConnected && issues.length === 0 && upload.status !== 'pending'

  return (
    <div className={styles.editor}>
      <p className={styles.summary}>{vehicleSummary}</p>
      <DrawOnMapButton target="mission" isEmpty={draft.length === 0} />
      {draft.length === 0 && !isDrawing ? (
        <p className={styles.hint}>{text.mission.empty(text.mission.draw)}</p>
      ) : null}
      {draft.length > 0 ? (
        <DraftPointList target="mission" issues={issues} legOrigin={home} />
      ) : null}
      {home && draft.length > 0 ? (
        <p className={styles.summary}>
          {text.mission.route(
            formatDistance(routeLengthMeters([home, ...draft, home]), messages.units),
          )}
        </p>
      ) : null}
      {generalIssues.length > 0 ? (
        <ul className={styles.issues} aria-label={text.mission.problems}>
          {generalIssues.map((issue) => (
            <li key={issue.code}>{describePlanIssue(issue, messages)}</li>
          ))}
        </ul>
      ) : null}
      {draft.length > 0 ? <p className={styles.hint}>{text.mission.uploadNote}</p> : null}
      <div className={styles.actions}>
        <button
          type="button"
          className={buttonStyles.button}
          disabled={!vehicleMission}
          onClick={() => {
            if (vehicleMission) {
              replacePoints('mission', vehicleMission.waypoints)
            }
          }}
        >
          {text.loadFromVehicle}
        </button>
        <button
          type="button"
          className={buttonStyles.button}
          disabled={draft.length === 0}
          onClick={() => {
            clearPoints('mission')
          }}
        >
          {text.clear}
        </button>
        <button
          type="button"
          className={classNames(buttonStyles.button, buttonStyles.primary)}
          disabled={!canUpload}
          onClick={() => {
            void uploadPlan(station.sendCommand, 'mission', {
              type: 'uploadMission',
              waypoints: draft.map(({ lat, lon }) => ({ lat, lon })),
            })
          }}
        >
          {text.uploadToVehicle}
        </button>
      </div>
      <p className={styles.uploadStatus} aria-live="polite">
        {describeUpload(upload, messages)}
      </p>
    </div>
  )
}
