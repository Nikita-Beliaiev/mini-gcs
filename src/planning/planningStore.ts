import { create } from 'zustand'
import type { LatLon } from '../geo/geo'
import type { CommandResult } from '../station/commandSender'
import {
  movePointTo,
  removePointById,
  shiftPointBy,
  toDraftPoints,
  type DraftPoint,
} from './pointList'

export type PlanTarget = 'mission' | 'geofence'

export type UploadState =
  { status: 'idle' } | { status: 'pending'; uploadId: number } | CommandResult

export interface PlanningData {
  editMode: PlanTarget | null
  drafts: Record<PlanTarget, DraftPoint[]>
  uploads: Record<PlanTarget, UploadState>
  nextPointId: number
  nextUploadId: number
}

interface PlanningActions {
  setEditMode: (mode: PlanTarget | null) => void
  addPoint: (target: PlanTarget, position: LatLon) => void
  movePoint: (target: PlanTarget, id: string, position: LatLon) => void
  removePoint: (target: PlanTarget, id: string) => void
  shiftPoint: (target: PlanTarget, id: string, offset: -1 | 1) => void
  replacePoints: (target: PlanTarget, positions: readonly LatLon[]) => void
  clearPoints: (target: PlanTarget) => void
  startUpload: (target: PlanTarget) => number
  finishUpload: (target: PlanTarget, uploadId: number, result: CommandResult) => void
}

export type PlanningState = PlanningData & PlanningActions

const IDLE_UPLOAD: UploadState = { status: 'idle' }

export const initialPlanningData: PlanningData = {
  editMode: null,
  drafts: { mission: [], geofence: [] },
  uploads: { mission: IDLE_UPLOAD, geofence: IDLE_UPLOAD },
  nextPointId: 1,
  nextUploadId: 1,
}

function draftChange(
  state: PlanningData,
  target: PlanTarget,
  points: DraftPoint[],
  usedIds = 0,
): Partial<PlanningData> {
  return {
    drafts: { ...state.drafts, [target]: points },
    uploads: { ...state.uploads, [target]: IDLE_UPLOAD },
    nextPointId: state.nextPointId + usedIds,
  }
}

export const usePlanningStore = create<PlanningState>()((set, get) => ({
  ...initialPlanningData,
  setEditMode: (editMode) => {
    set({ editMode })
  },
  addPoint: (target, position) => {
    set((state) =>
      draftChange(
        state,
        target,
        [...state.drafts[target], ...toDraftPoints([position], state.nextPointId)],
        1,
      ),
    )
  },
  movePoint: (target, id, position) => {
    set((state) => draftChange(state, target, movePointTo(state.drafts[target], id, position)))
  },
  removePoint: (target, id) => {
    set((state) => draftChange(state, target, removePointById(state.drafts[target], id)))
  },
  shiftPoint: (target, id, offset) => {
    set((state) => draftChange(state, target, shiftPointBy(state.drafts[target], id, offset)))
  },
  replacePoints: (target, positions) => {
    set((state) =>
      draftChange(state, target, toDraftPoints(positions, state.nextPointId), positions.length),
    )
  },
  clearPoints: (target) => {
    set((state) => draftChange(state, target, []))
  },
  startUpload: (target) => {
    const uploadId = get().nextUploadId
    set((state) => ({
      nextUploadId: uploadId + 1,
      uploads: { ...state.uploads, [target]: { status: 'pending', uploadId } },
    }))
    return uploadId
  },
  finishUpload: (target, uploadId, result) => {
    set((state) => {
      const current = state.uploads[target]
      if (current.status !== 'pending' || current.uploadId !== uploadId) {
        return state
      }
      return { uploads: { ...state.uploads, [target]: result } }
    })
  },
}))
