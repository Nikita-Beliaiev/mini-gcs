import { create } from 'zustand'
import type { LatLon } from '../geo/geo'

interface MapPointsState {
  cursor: LatLon | null
  setCursor: (cursor: LatLon | null) => void
}

export const initialMapPointsData = { cursor: null }

export const useMapPointsStore = create<MapPointsState>()((set) => ({
  ...initialMapPointsData,
  setCursor: (cursor) => {
    set({ cursor })
  },
}))
