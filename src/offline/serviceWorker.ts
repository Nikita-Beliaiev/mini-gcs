import { registerSW } from 'virtual:pwa-register'
import { useAppUpdateStore } from './appUpdate'

export function startServiceWorker(): void {
  const updateServiceWorker = registerSW({
    onNeedRefresh: () => {
      useAppUpdateStore.setState({ updateReady: true })
    },
    onOfflineReady: () => {
      useAppUpdateStore.setState({ offlineReady: true })
    },
  })
  useAppUpdateStore.setState({
    applyUpdate: () => {
      void updateServiceWorker(true)
    },
  })
}
