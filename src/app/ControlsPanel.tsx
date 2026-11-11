import { useId } from 'react'
import { FaultPanel } from '../faults/FaultPanel'
import { useMessages } from '../i18n/localeStore'
import { GeofencePanel } from '../planning/GeofencePanel'
import { MissionPanel } from '../planning/MissionPanel'
import { usePlanningStore } from '../planning/planningStore'
import { FlightLogControls } from '../replay/FlightLogControls'
import { classNames } from '../ui/classNames'
import panelStyles from '../ui/panel.module.css'
import { Tabs } from '../ui/Tabs'
import styles from './ControlsPanel.module.css'

export function ControlsPanel() {
  const text = useMessages().controls
  const titleId = useId()
  const setEditMode = usePlanningStore((state) => state.setEditMode)

  return (
    <section className={classNames(panelStyles.panel, styles.controls)} aria-labelledby={titleId}>
      <h2 id={titleId} className={panelStyles.title}>
        {text.title}
      </h2>
      <Tabs
        label={text.title}
        items={[
          { id: 'mission', label: text.tabs.mission, content: <MissionPanel /> },
          { id: 'geofence', label: text.tabs.geofence, content: <GeofencePanel /> },
          { id: 'simulator', label: text.tabs.simulator, content: <FaultPanel /> },
          { id: 'flightLog', label: text.tabs.flightLog, content: <FlightLogControls /> },
        ]}
        onChange={() => {
          setEditMode(null)
        }}
      />
    </section>
  )
}
