import buttonStyles from '../ui/button.module.css'
import styles from './PlanEditor.module.css'
import { usePlanningStore, type PlanTarget } from './planningStore'

interface EditOnMapToggleProps {
  target: PlanTarget
  hint: string
}

export function EditOnMapToggle({ target, hint }: EditOnMapToggleProps) {
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
        Edit on map
      </button>
      {isEditing ? <p className={styles.hint}>{hint}</p> : null}
    </div>
  )
}
