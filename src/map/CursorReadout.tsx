import { formatMgrs } from '../geo/mgrs'
import { useMessages } from '../i18n/localeStore'
import { formatCoordinates, formatElevation } from '../telemetry/format'
import { useTerrain } from '../terrain/terrainContext'
import styles from './CursorReadout.module.css'
import { useMapPointsStore } from './mapPointsStore'

export function CursorReadout() {
  const messages = useMessages()
  const cursor = useMapPointsStore((state) => state.cursor)
  const terrain = useTerrain()

  if (!cursor) {
    return null
  }
  const mgrs = formatMgrs(cursor)

  return (
    <div role="group" aria-label={messages.map.cursor} className={styles.cursor}>
      <span>{formatCoordinates(cursor)}</span>
      {mgrs ? <span>{mgrs}</span> : null}
      <span>
        {messages.map.elevation(formatElevation(terrain.elevationAt(cursor), messages.units))}
      </span>
    </div>
  )
}
