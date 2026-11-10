import { routeLengthMeters } from '../geo/geo'
import { validateMission, type PlanIssue } from '../mission/missionRules'
import { useConnectionStatus, useGroundStation, useTelemetry } from '../station/stationContext'
import { formatDistance } from '../telemetry/format'
import buttonStyles from '../ui/button.module.css'
import { classNames } from '../ui/classNames'
import styles from './PlanEditor.module.css'
import { usePlanningStore } from './planningStore'
import { DraftPointList } from './DraftPointList'
import { EditOnMapToggle } from './EditOnMapToggle'
import { describeUpload, uploadPlan } from './uploadPlan'
import { describeVehicleMission } from './vehicleMission'

const WAITING_FOR_HOME: PlanIssue = { pointIndex: null, message: 'Waiting for the home position' }

export function MissionPanel() {
  const station = useGroundStation()
  const isConnected = useConnectionStatus() === 'connected'
  const draft = usePlanningStore((state) => state.drafts.mission)
  const upload = usePlanningStore((state) => state.uploads.mission)
  const replacePoints = usePlanningStore((state) => state.replacePoints)
  const clearPoints = usePlanningStore((state) => state.clearPoints)
  const home = useTelemetry((state) => state.home)
  const vehicleMission = useTelemetry((state) => state.mission)
  const vehicleGeofence = useTelemetry((state) => state.geofence?.polygon ?? null)
  const vehicleSummary = useTelemetry(describeVehicleMission)

  const issues = home ? validateMission(draft, home, vehicleGeofence) : [WAITING_FOR_HOME]
  const generalIssues =
    draft.length === 0 ? [] : issues.filter((issue) => issue.pointIndex === null)
  const canUpload = isConnected && issues.length === 0 && upload.status !== 'pending'

  return (
    <div className={styles.editor}>
      <p className={styles.summary}>{vehicleSummary}</p>
      <EditOnMapToggle
        target="mission"
        hint="Click the map to add a waypoint, drag a number to move it."
      />
      {draft.length === 0 ? (
        <p className={styles.hint}>
          No waypoints yet. Load the vehicle mission or add points on the map.
        </p>
      ) : (
        <DraftPointList
          target="mission"
          listLabel="Mission waypoints"
          shortName="WP"
          itemName="waypoint"
          issues={issues}
          legOrigin={home}
        />
      )}
      {home && draft.length > 0 ? (
        <p className={styles.summary}>
          Route {formatDistance(routeLengthMeters([home, ...draft, home]))} from home and back
        </p>
      ) : null}
      {generalIssues.length > 0 ? (
        <ul className={styles.issues} aria-label="Mission problems">
          {generalIssues.map((issue) => (
            <li key={issue.message}>{issue.message}</li>
          ))}
        </ul>
      ) : null}
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
          Load from vehicle
        </button>
        <button
          type="button"
          className={buttonStyles.button}
          disabled={draft.length === 0}
          onClick={() => {
            clearPoints('mission')
          }}
        >
          Clear
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
          Upload to vehicle
        </button>
      </div>
      <p className={styles.uploadStatus} aria-live="polite">
        {describeUpload(upload)}
      </p>
    </div>
  )
}
