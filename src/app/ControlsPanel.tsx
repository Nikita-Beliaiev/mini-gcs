import { useId } from 'react'
import { FaultPanel } from '../faults/FaultPanel'
import { GeofencePanel } from '../planning/GeofencePanel'
import { MissionPanel } from '../planning/MissionPanel'
import { usePlanningStore } from '../planning/planningStore'
import { FlightLogControls } from '../replay/FlightLogControls'
import { classNames } from '../ui/classNames'
import panelStyles from '../ui/panel.module.css'
import { Tabs } from '../ui/Tabs'
import styles from './ControlsPanel.module.css'

export function ControlsPanel() {
  const titleId = useId()
  const setEditMode = usePlanningStore((state) => state.setEditMode)

  return (
    <section className={classNames(panelStyles.panel, styles.controls)} aria-labelledby={titleId}>
      <h2 id={titleId} className={panelStyles.title}>
        Controls
      </h2>
      <Tabs
        label="Controls"
        items={[
          { id: 'mission', label: 'Mission', content: <MissionPanel /> },
          { id: 'geofence', label: 'Geofence', content: <GeofencePanel /> },
          { id: 'simulator', label: 'Simulator', content: <FaultPanel /> },
          { id: 'flightLog', label: 'Flight log', content: <FlightLogControls /> },
        ]}
        onChange={() => {
          setEditMode(null)
        }}
      />
    </section>
  )
}
