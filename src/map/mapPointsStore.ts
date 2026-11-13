import { create } from 'zustand'
import type { LatLon } from '../geo/geo'

interface MapPointsState {
  cursor: LatLon | null
  selected: LatLon | null
  setCursor: (cursor: LatLon | null) => void
  select: (point: LatLon) => void
  clearSelection: () => void
}

export const initialMapPointsData = { cursor: null, selected: null }

export const useMapPointsStore = create<MapPointsState>()((set) => ({
  ...initialMapPointsData,
  setCursor: (cursor) => {
    set({ cursor })
  },
  select: (point) => {
    set({ selected: point })
  },
  clearSelection: () => {
    set({ selected: null })
  },
}))
