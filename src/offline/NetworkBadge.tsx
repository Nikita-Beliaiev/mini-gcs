import { useMessages } from '../i18n/localeStore'
import { useMapSourceStore } from './mapSourceStore'
import styles from './OfflinePanel.module.css'

export function NetworkBadge() {
  const text = useMessages().offline
  const isOnline = useMapSourceStore((state) => state.isOnline)

  return isOnline ? null : <span className={styles.badge}>{text.noNetwork}</span>
}
