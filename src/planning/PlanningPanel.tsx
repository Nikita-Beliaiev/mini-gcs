import { useId } from 'react'
import { classNames } from '../ui/classNames'
import panelStyles from '../ui/panel.module.css'
import { MissionPanel } from './MissionPanel'
import styles from './PlanningPanel.module.css'

export function PlanningPanel() {
  const titleId = useId()

  return (
    <section className={classNames(panelStyles.panel, styles.planning)} aria-labelledby={titleId}>
      <h2 id={titleId} className={panelStyles.title}>
        Mission
      </h2>
      <MissionPanel />
    </section>
  )
}
