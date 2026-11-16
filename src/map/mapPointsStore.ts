import { create } from 'zustand'
import type { LatLon } from '../geo/geo'

interface CenterRequest {
  point: LatLon
}

interface MapPointsState {
  cursor: LatLon | null
  selected: LatLon | null
  centerRequest: CenterRequest | null
  setCursor: (cursor: LatLon | null) => void
  select: (point: LatLon) => void
  showOnMap: (point: LatLon) => void
  clearSelection: () => void
}

export const initialMapPointsData = { cursor: null, selected: null, centerRequest: null }

export const useMapPointsStore = create<MapPointsState>()((set) => ({
  ...initialMapPointsData,
  setCursor: (cursor) => {
    set({ cursor })
  },
  select: (point) => {
    set({ selected: point })
  },
  showOnMap: (point) => {
    set({ selected: point, centerRequest: { point } })
  },
  clearSelection: () => {
    set({ selected: null })
  },
}))
