import { useMessages } from '../i18n/localeStore'
import buttonStyles from '../ui/button.module.css'
import { useAppUpdateStore } from './appUpdate'
import styles from './UpdatePrompt.module.css'

export function UpdatePrompt() {
  const text = useMessages().offline
  const updateReady = useAppUpdateStore((state) => state.updateReady)
  const applyUpdate = useAppUpdateStore((state) => state.applyUpdate)

  if (!updateReady) {
    return null
  }

  return (
    <p className={styles.prompt} role="status">
      {text.updateReady}
      <button type="button" className={buttonStyles.button} onClick={applyUpdate}>
        {text.reload}
      </button>
    </p>
  )
}
