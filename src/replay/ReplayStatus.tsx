import { useSession } from '../session/sessionContext'
import buttonStyles from '../ui/button.module.css'
import styles from './ReplayStatus.module.css'

export function ReplayStatus() {
  const { returnToLive } = useSession()

  return (
    <div className={styles.replayStatus}>
      <p className={styles.status} role="status">
        <span className={styles.dot} aria-hidden="true" />
        Replay
      </p>
      <button type="button" className={buttonStyles.button} onClick={returnToLive}>
        Back to live
      </button>
    </div>
  )
}
