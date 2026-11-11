import { useMessages } from '../i18n/localeStore'
import buttonStyles from '../ui/button.module.css'
import styles from './PlanEditor.module.css'
import { usePlanningStore, type PlanTarget } from './planningStore'

interface EditOnMapToggleProps {
  target: PlanTarget
}

export function EditOnMapToggle({ target }: EditOnMapToggleProps) {
  const text = useMessages().planning
  const isEditing = usePlanningStore((state) => state.editMode === target)
  const setEditMode = usePlanningStore((state) => state.setEditMode)

  return (
    <div className={styles.editToggle}>
      <button
        type="button"
        className={buttonStyles.button}
        aria-pressed={isEditing}
        onClick={() => {
          setEditMode(isEditing ? null : target)
        }}
      >
        {text.editOnMap}
      </button>
      {isEditing ? <p className={styles.hint}>{text[target].editHint}</p> : null}
    </div>
  )
}
