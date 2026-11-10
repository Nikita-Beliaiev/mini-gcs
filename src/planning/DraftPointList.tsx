import { distanceMeters, type LatLon } from '../geo/geo'
import type { PlanIssue } from '../mission/missionRules'
import { formatCoordinates, formatDistance } from '../telemetry/format'
import buttonStyles from '../ui/button.module.css'
import { classNames } from '../ui/classNames'
import styles from './PlanEditor.module.css'
import { usePlanningStore, type PlanTarget } from './planningStore'

interface DraftPointListProps {
  target: PlanTarget
  listLabel: string
  shortName: string
  itemName: string
  issues: readonly PlanIssue[]
  legOrigin: LatLon | null
}

export function DraftPointList({
  target,
  listLabel,
  shortName,
  itemName,
  issues,
  legOrigin,
}: DraftPointListProps) {
  const points = usePlanningStore((state) => state.drafts[target])
  const shiftPoint = usePlanningStore((state) => state.shiftPoint)
  const removePoint = usePlanningStore((state) => state.removePoint)
  const iconButton = classNames(buttonStyles.button, buttonStyles.icon)

  return (
    <ol className={styles.points} aria-label={listLabel}>
      {points.map((point, index) => {
        const number = String(index + 1)
        const previous = index === 0 ? legOrigin : (points[index - 1] ?? null)
        const pointIssues = issues.filter((issue) => issue.pointIndex === index)

        return (
          <li key={point.id} className={styles.point} data-invalid={pointIssues.length > 0}>
            <span className={styles.pointName}>
              {shortName} {number}
            </span>
            <span className={styles.pointDetails}>
              {formatCoordinates(point)}
              {legOrigin
                ? ` · ${formatDistance(previous ? distanceMeters(previous, point) : undefined)}`
                : null}
            </span>
            <span className={styles.pointActions}>
              <button
                type="button"
                className={iconButton}
                aria-label={`Move ${itemName} ${number} up`}
                disabled={index === 0}
                onClick={() => {
                  shiftPoint(target, point.id, -1)
                }}
              >
                ↑
              </button>
              <button
                type="button"
                className={iconButton}
                aria-label={`Move ${itemName} ${number} down`}
                disabled={index === points.length - 1}
                onClick={() => {
                  shiftPoint(target, point.id, 1)
                }}
              >
                ↓
              </button>
              <button
                type="button"
                className={iconButton}
                aria-label={`Remove ${itemName} ${number}`}
                onClick={() => {
                  removePoint(target, point.id)
                }}
              >
                ✕
              </button>
            </span>
            {pointIssues.map((issue) => (
              <span key={issue.message} className={styles.pointIssue}>
                {issue.message}
              </span>
            ))}
          </li>
        )
      })}
    </ol>
  )
}
