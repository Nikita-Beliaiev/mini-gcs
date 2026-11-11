import { lazy, Suspense, useId } from 'react'
import { useMessages } from '../i18n/localeStore'
import { classNames } from '../ui/classNames'
import panelStyles from '../ui/panel.module.css'
import { CHART_WINDOW_MS } from './chartData'
import { CHARTS } from './chartConfigs'
import styles from './ChartsPanel.module.css'

const TimeSeriesChart = lazy(() => import('./TimeSeriesChart'))

export function ChartsPanel() {
  const text = useMessages().charts
  const titleId = useId()

  return (
    <section className={classNames(panelStyles.panel, styles.charts)} aria-labelledby={titleId}>
      <h2 id={titleId} className={panelStyles.title}>
        {text.title(CHART_WINDOW_MS / 1000)}
      </h2>
      <Suspense fallback={<p className={styles.placeholder}>{text.loading}</p>}>
        <div className={styles.grid}>
          {CHARTS.map((config) => (
            <TimeSeriesChart key={config.id} config={config} />
          ))}
        </div>
      </Suspense>
    </section>
  )
}
