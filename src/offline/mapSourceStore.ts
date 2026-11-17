import { create } from 'zustand'

interface MapSourceData {
  isOnline: boolean
  preferArea: boolean
}

interface MapSourceState extends MapSourceData {
  setPreferArea: (preferArea: boolean) => void
}

export const initialMapSourceData: MapSourceData = { isOnline: true, preferArea: false }

export const useMapSourceStore = create<MapSourceState>()((set) => ({
  ...initialMapSourceData,
  setPreferArea: (preferArea) => {
    set({ preferArea })
  },
}))

export function usesAreaPackage({ isOnline, preferArea }: MapSourceData): boolean {
  return preferArea || !isOnline
}

export function useUsesAreaPackage(): boolean {
  return useMapSourceStore(usesAreaPackage)
}

export function startNetworkWatch(): () => void {
  function update(): void {
    useMapSourceStore.setState({ isOnline: navigator.onLine })
  }
  update()
  window.addEventListener('online', update)
  window.addEventListener('offline', update)
  return () => {
    window.removeEventListener('online', update)
    window.removeEventListener('offline', update)
  }
}
