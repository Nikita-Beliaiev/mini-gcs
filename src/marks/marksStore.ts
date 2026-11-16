import { create } from 'zustand'
import { cleanMarkName, mergeMarks, type Mark, type MarkDraft } from './mark'

interface MarksState {
  marks: Mark[]
  add: (draft: MarkDraft) => Mark
  rename: (id: string, name: string) => void
  remove: (id: string) => void
  importMarks: (marks: readonly Mark[]) => void
}

export const initialMarksData: Pick<MarksState, 'marks'> = { marks: [] }

export const useMarksStore = create<MarksState>()((set) => ({
  ...initialMarksData,
  add: (draft) => {
    const mark: Mark = {
      id: crypto.randomUUID(),
      name: cleanMarkName(draft.name),
      lat: draft.lat,
      lon: draft.lon,
      affiliation: draft.affiliation,
      kind: draft.kind,
      createdAt: new Date().toISOString(),
    }
    set((state) => ({ marks: [...state.marks, mark] }))
    return mark
  },
  rename: (id, name) => {
    const cleanName = cleanMarkName(name)
    if (!cleanName) {
      return
    }
    set((state) => ({
      marks: state.marks.map((mark) => (mark.id === id ? { ...mark, name: cleanName } : mark)),
    }))
  },
  remove: (id) => {
    set((state) => ({ marks: state.marks.filter((mark) => mark.id !== id) }))
  },
  importMarks: (marks) => {
    set((state) => ({ marks: mergeMarks(state.marks, marks) }))
  },
}))
