import { useId, useState } from 'react'
import { useMessages } from '../i18n/localeStore'
import { classNames } from '../ui/classNames'
import panelStyles from '../ui/panel.module.css'
import type { Mark } from './mark'
import { MarkRow } from './MarkRow'
import styles from './MarksPanel.module.css'
import { useMarksStore } from './marksStore'

export function MarksPanel() {
  const text = useMessages().marks
  const titleId = useId()
  const marks = useMarksStore((state) => state.marks)
  const removeMark = useMarksStore((state) => state.remove)
  const [status, setStatus] = useState('')

  function remove(mark: Mark): void {
    removeMark(mark.id)
    setStatus(text.removed(mark.name))
  }

  return (
    <section className={classNames(panelStyles.panel, styles.marks)} aria-labelledby={titleId}>
      <h2 id={titleId} className={panelStyles.title}>
        {text.title}
      </h2>
      <p className={styles.note}>{text.note}</p>
      {marks.length === 0 ? (
        <p className={styles.note}>{text.empty}</p>
      ) : (
        <ul className={styles.list}>
          {marks.map((mark) => (
            <MarkRow key={mark.id} mark={mark} onRemove={remove} />
          ))}
        </ul>
      )}
      <p className={styles.status} aria-live="polite">
        {status}
      </p>
    </section>
  )
}
