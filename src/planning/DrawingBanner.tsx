import { useMessages } from '../i18n/localeStore'
import buttonStyles from '../ui/button.module.css'
import { classNames } from '../ui/classNames'
import styles from './DrawingBanner.module.css'
import { usePlanningStore } from './planningStore'

export function DrawingBanner() {
  const text = useMessages().planning
  const editMode = usePlanningStore((state) => state.editMode)
  const setEditMode = usePlanningStore((state) => state.setEditMode)

  return (
    <div className={styles.drawing} aria-live="polite">
      {editMode ? (
        <div className={styles.banner}>
          <p className={styles.hint}>{text[editMode].drawingHint}</p>
          <button
            type="button"
            className={classNames(buttonStyles.button, buttonStyles.primary)}
            onClick={() => {
              setEditMode(null)
            }}
          >
            {text.done}
          </button>
        </div>
      ) : null}
    </div>
  )
}
