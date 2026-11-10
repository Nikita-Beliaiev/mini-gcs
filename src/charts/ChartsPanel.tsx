import { lazy, Suspense, useId } from 'react'
import { classNames } from '../ui/classNames'
import panelStyles from '../ui/panel.module.css'
import { CHARTS } from './chartConfigs'
import styles from './ChartsPanel.module.css'

const TimeSeriesChart = lazy(() => import('./TimeSeriesChart'))

export function ChartsPanel() {
  const titleId = useId()

  return (
    <section className={classNames(panelStyles.panel, styles.charts)} aria-labelledby={titleId}>
      <h2 id={titleId} className={panelStyles.title}>
        Last 60 seconds
      </h2>
      <Suspense fallback={<p className={styles.placeholder}>Loading charts…</p>}>
        <div className={styles.grid}>
          {CHARTS.map((config) => (
            <TimeSeriesChart key={config.title} config={config} />
          ))}
        </div>
      </Suspense>
    </section>
  )
}
