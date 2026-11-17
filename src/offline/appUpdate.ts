import { create } from 'zustand'

interface AppUpdateState {
  updateReady: boolean
  offlineReady: boolean
  applyUpdate: () => void
}

export const initialAppUpdateData: Omit<AppUpdateState, 'applyUpdate'> = {
  updateReady: false,
  offlineReady: false,
}

export const useAppUpdateStore = create<AppUpdateState>()(() => ({
  ...initialAppUpdateData,
  applyUpdate: () => undefined,
}))
