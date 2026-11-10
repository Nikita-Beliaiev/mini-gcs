import { useId } from 'react'
import { classNames } from '../ui/classNames'
import panelStyles from '../ui/panel.module.css'
import { Tabs } from '../ui/Tabs'
import { GeofencePanel } from './GeofencePanel'
import { MissionPanel } from './MissionPanel'
import styles from './PlanningPanel.module.css'
import { usePlanningStore } from './planningStore'

export function PlanningPanel() {
  const titleId = useId()
  const setEditMode = usePlanningStore((state) => state.setEditMode)

  return (
    <section className={classNames(panelStyles.panel, styles.planning)} aria-labelledby={titleId}>
      <h2 id={titleId} className={panelStyles.title}>
        Planning
      </h2>
      <Tabs
        label="Planning"
        items={[
          { id: 'mission', label: 'Mission', content: <MissionPanel /> },
          { id: 'geofence', label: 'Geofence', content: <GeofencePanel /> },
        ]}
        onChange={() => {
          setEditMode(null)
        }}
      />
    </section>
  )
}
