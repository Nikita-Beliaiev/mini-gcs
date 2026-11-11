import { useMessages } from '../i18n/localeStore'
import buttonStyles from '../ui/button.module.css'
import { classNames } from '../ui/classNames'
import styles from './PlanEditor.module.css'
import { usePlanningStore, type PlanTarget } from './planningStore'

interface DrawOnMapButtonProps {
  target: PlanTarget
  isEmpty: boolean
}

export function DrawOnMapButton({ target, isEmpty }: DrawOnMapButtonProps) {
  const text = useMessages().planning
  const isDrawing = usePlanningStore((state) => state.editMode === target)
  const setEditMode = usePlanningStore((state) => state.setEditMode)

  return (
    <div className={styles.drawAction}>
      <button
        type="button"
        className={classNames(buttonStyles.button, isEmpty && !isDrawing && buttonStyles.primary)}
        onClick={() => {
          setEditMode(isDrawing ? null : target)
        }}
      >
        {isDrawing ? text.finishDrawing : text[target].draw}
      </button>
    </div>
  )
}
