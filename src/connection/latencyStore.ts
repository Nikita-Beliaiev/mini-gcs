import { create } from 'zustand'

interface LatencyState {
  latencyMs: number | null
  setLatency: (latencyMs: number | null) => void
}

export const initialLatencyData = { latencyMs: null }

export const useLatencyStore = create<LatencyState>()((set) => ({
  ...initialLatencyData,
  setLatency: (latencyMs) => {
    set({ latencyMs })
  },
}))
