import { useMessages } from '../i18n/localeStore'
import { useSession } from '../session/sessionContext'
import buttonStyles from '../ui/button.module.css'
import styles from './ReplayStatus.module.css'

export function ReplayStatus() {
  const text = useMessages().replay
  const { returnToLive } = useSession()

  return (
    <div className={styles.replayStatus}>
      <p className={styles.status} role="status">
        <span className={styles.dot} aria-hidden="true" />
        {text.status}
      </p>
      <button type="button" className={buttonStyles.button} onClick={returnToLive}>
        {text.backToLive}
      </button>
    </div>
  )
}
