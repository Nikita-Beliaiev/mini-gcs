import { formatMgrs } from '../geo/mgrs'
import type { Messages } from '../i18n/en'
import { useMessages } from '../i18n/localeStore'
import { useTelemetry } from '../station/stationContext'
import { formatCoordinates, formatDistance, formatSignedAngle, NO_VALUE } from '../telemetry/format'
import type { TelemetryState } from '../telemetry/telemetryStore'
import { useTerrain } from '../terrain/terrainContext'
import type { TerrainSampler } from '../terrain/terrainSampler'
import styles from './CameraPanel.module.css'
import { cameraCenter } from './cameraTarget'

function describeAngles({ camera }: TelemetryState, text: Messages['camera']): string {
  if (!camera) {
    return NO_VALUE
  }
  return `${text.tilt} ${formatSignedAngle(camera.tiltDeg)}  ${text.pan} ${formatSignedAngle(camera.panDeg)}`
}

function describeCenter(
  state: TelemetryState,
  terrain: TerrainSampler,
  messages: Messages,
): string {
  if (!state.camera) {
    return NO_VALUE
  }
  const center = cameraCenter(state, terrain)
  if (!center) {
    return messages.camera.aboveHorizon
  }
  const reference = formatMgrs(center.point) ?? formatCoordinates(center.point)
  return `${reference} · ${messages.camera.range(formatDistance(center.rangeM, messages.units))}`
}

export function CameraHud() {
  const messages = useMessages()
  const terrain = useTerrain()
  const angles = useTelemetry((state) => describeAngles(state, messages.camera))
  const center = useTelemetry((state) => describeCenter(state, terrain, messages))

  return (
    <div className={styles.hud}>
      <span className={styles.hudTopLeft}>{angles}</span>
      <span className={styles.crosshair} aria-hidden="true" />
      <span className={styles.hudBottom}>{center}</span>
    </div>
  )
}
