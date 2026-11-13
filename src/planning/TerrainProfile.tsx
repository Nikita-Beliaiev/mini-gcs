import { lazy, Suspense, useId } from 'react'
import type { LatLon } from '../geo/geo'
import type { Messages } from '../i18n/en'
import { useMessages } from '../i18n/localeStore'
import { MISSION_ALTITUDE_M } from '../mission/missionRules'
import { formatDistance } from '../telemetry/format'
import { useTerrain } from '../terrain/terrainContext'
import {
  buildRouteProfile,
  MIN_TERRAIN_CLEARANCE_M,
  type RouteProfile,
} from '../terrain/routeProfile'
import { PROFILE_COLORS } from './profileColors'
import styles from './TerrainProfile.module.css'

const TerrainProfileChart = lazy(() => import('./TerrainProfileChart'))

interface TerrainProfileProps {
  home: LatLon
  waypoints: readonly LatLon[]
}

function describeLowest(profile: RouteProfile, waypointCount: number, messages: Messages): string {
  const text = messages.planning.mission
  const pointName = (index: number) =>
    index === 0 || index > waypointCount ? text.profile.home : `${text.shortName} ${String(index)}`
  const { clearanceM, legIndex } = profile.lowest
  const from = pointName(legIndex)
  const to = pointName(legIndex + 1)
  const altitude = formatDistance(MISSION_ALTITUDE_M, messages.units)

  if (clearanceM < 0) {
    return text.profile.belowGround(formatDistance(-clearanceM, messages.units), from, to, altitude)
  }
  const clearance = formatDistance(clearanceM, messages.units)
  return clearanceM < MIN_TERRAIN_CLEARANCE_M
    ? text.profile.lowClearance(clearance, from, to, altitude)
    : text.profile.lowestClearance(clearance, from, to)
}

export function TerrainProfile({ home, waypoints }: TerrainProfileProps) {
  const messages = useMessages()
  const text = messages.planning.mission.profile
  const titleId = useId()
  const terrain = useTerrain()
  const profile = buildRouteProfile([home, ...waypoints, home], MISSION_ALTITUDE_M, terrain)

  if (!profile) {
    return <p className={styles.hint}>{text.noTerrain}</p>
  }
  const isTooLow = profile.lowest.clearanceM < MIN_TERRAIN_CLEARANCE_M

  return (
    <figure className={styles.profile} aria-labelledby={titleId}>
      <figcaption className={styles.caption}>
        <span id={titleId}>{text.title}</span>
        <span className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={styles.swatch} style={{ background: PROFILE_COLORS.ground }} />
            {text.ground}
          </span>
          <span className={styles.legendItem}>
            <span className={styles.swatch} style={{ background: PROFILE_COLORS.flight }} />
            {text.flightAltitude}
          </span>
        </span>
      </figcaption>
      <Suspense fallback={<div className={styles.plot} />}>
        <TerrainProfileChart profile={profile} />
      </Suspense>
      <p className={isTooLow ? styles.warning : styles.hint}>
        {describeLowest(profile, waypoints.length, messages)}
      </p>
    </figure>
  )
}
