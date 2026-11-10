import { MIN_GEOFENCE_VERTICES, validateGeofence, type PlanIssue } from '../mission/missionRules'
import { useConnectionStatus, useGroundStation, useTelemetry } from '../station/stationContext'
import buttonStyles from '../ui/button.module.css'
import { classNames } from '../ui/classNames'
import { DraftPointList } from './DraftPointList'
import { EditOnMapToggle } from './EditOnMapToggle'
import styles from './PlanEditor.module.css'
import { usePlanningStore } from './planningStore'
import { describeUpload, uploadPlan } from './uploadPlan'
import { countOutside, describeVehicleGeofence, describeWaypointsOutside } from './vehicleGeofence'

const WAITING_FOR_HOME: PlanIssue = { pointIndex: null, message: 'Waiting for the home position' }

export function GeofencePanel() {
  const station = useGroundStation()
  const isConnected = useConnectionStatus() === 'connected'
  const draft = usePlanningStore((state) => state.drafts.geofence)
  const upload = usePlanningStore((state) => state.uploads.geofence)
  const replacePoints = usePlanningStore((state) => state.replacePoints)
  const clearPoints = usePlanningStore((state) => state.clearPoints)
  const home = useTelemetry((state) => state.home)
  const vehicleGeofence = useTelemetry((state) => state.geofence?.polygon ?? null)
  const vehicleWaypoints = useTelemetry((state) => state.mission?.waypoints ?? null)
  const vehicleSummary = useTelemetry(describeVehicleGeofence)

  const issues = home ? validateGeofence(draft, home) : [WAITING_FOR_HOME]
  const generalIssues = draft.length === 0 ? [] : issues
  const waypointsOutside =
    vehicleWaypoints && draft.length >= MIN_GEOFENCE_VERTICES
      ? countOutside(vehicleWaypoints, draft)
      : 0
  const isBusy = upload.status === 'pending'
  const canUpload = isConnected && issues.length === 0 && !isBusy

  return (
    <div className={styles.editor}>
      <p className={styles.summary}>{vehicleSummary}</p>
      <EditOnMapToggle
        target="geofence"
        hint="Click the map to add a vertex, drag a square to move it."
      />
      {draft.length === 0 ? (
        <p className={styles.hint}>
          No vertices yet. Load the vehicle geofence or add points on the map.
        </p>
      ) : (
        <DraftPointList
          target="geofence"
          listLabel="Geofence vertices"
          shortName="V"
          itemName="vertex"
          issues={issues}
          legOrigin={null}
        />
      )}
      {generalIssues.length > 0 ? (
        <ul className={styles.issues} aria-label="Geofence problems">
          {generalIssues.map((issue) => (
            <li key={issue.message}>{issue.message}</li>
          ))}
        </ul>
      ) : null}
      {waypointsOutside > 0 ? (
        <p className={styles.warning}>{describeWaypointsOutside(waypointsOutside)}</p>
      ) : null}
      <div className={styles.actions}>
        <button
          type="button"
          className={buttonStyles.button}
          disabled={!vehicleGeofence}
          onClick={() => {
            if (vehicleGeofence) {
              replacePoints('geofence', vehicleGeofence)
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
            clearPoints('geofence')
          }}
        >
          Clear
        </button>
        <button
          type="button"
          className={buttonStyles.button}
          disabled={!isConnected || !vehicleGeofence || isBusy}
          onClick={() => {
            void uploadPlan(station.sendCommand, 'geofence', { type: 'clearGeofence' })
          }}
        >
          Remove from vehicle
        </button>
        <button
          type="button"
          className={classNames(buttonStyles.button, buttonStyles.primary)}
          disabled={!canUpload}
          onClick={() => {
            void uploadPlan(station.sendCommand, 'geofence', {
              type: 'uploadGeofence',
              polygon: draft.map(({ lat, lon }) => ({ lat, lon })),
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
