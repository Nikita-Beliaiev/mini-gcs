import { describe, expect, it } from 'vitest'
import { usePlanningStore } from './planningStore'

function store() {
  return usePlanningStore.getState()
}

function missionIds(): string[] {
  return store().drafts.mission.map((point) => point.id)
}

describe('usePlanningStore', () => {
  it('adds points with fresh ids to the chosen draft', () => {
    store().addPoint('mission', { lat: 1, lon: 1 })
    store().addPoint('geofence', { lat: 2, lon: 2 })
    store().addPoint('mission', { lat: 3, lon: 3 })

    expect(store().drafts.mission).toEqual([
      { id: 'point-1', lat: 1, lon: 1 },
      { id: 'point-3', lat: 3, lon: 3 },
    ])
    expect(store().drafts.geofence).toEqual([{ id: 'point-2', lat: 2, lon: 2 }])
  })

  it('moves, reorders and removes points', () => {
    store().replacePoints('mission', [
      { lat: 1, lon: 1 },
      { lat: 2, lon: 2 },
      { lat: 3, lon: 3 },
    ])

    store().movePoint('mission', 'point-2', { lat: 5, lon: 5 })
    store().shiftPoint('mission', 'point-3', -1)
    store().removePoint('mission', 'point-1')

    expect(store().drafts.mission).toEqual([
      { id: 'point-3', lat: 3, lon: 3 },
      { id: 'point-2', lat: 5, lon: 5 },
    ])
  })

  it('clears one draft without touching the other', () => {
    store().addPoint('mission', { lat: 1, lon: 1 })
    store().addPoint('geofence', { lat: 2, lon: 2 })

    store().clearPoints('mission')

    expect(store().drafts.mission).toEqual([])
    expect(store().drafts.geofence).toHaveLength(1)
  })

  it('switches the map edit mode', () => {
    store().setEditMode('geofence')
    expect(store().editMode).toBe('geofence')

    store().setEditMode(null)
    expect(store().editMode).toBeNull()
  })

  it('tracks an upload from pending to its result', () => {
    const uploadId = store().startUpload('mission')
    expect(store().uploads.mission).toEqual({ status: 'pending', uploadId })

    store().finishUpload('mission', uploadId, { status: 'rejected', reason: 'Too far' })
    expect(store().uploads.mission).toEqual({ status: 'rejected', reason: 'Too far' })
  })

  it('forgets the upload result once the draft changes', () => {
    const uploadId = store().startUpload('mission')
    store().finishUpload('mission', uploadId, { status: 'accepted' })

    store().addPoint('mission', { lat: 1, lon: 1 })

    expect(store().uploads.mission).toEqual({ status: 'idle' })
  })

  it('ignores the result of an upload whose draft has changed since', () => {
    const uploadId = store().startUpload('mission')
    store().addPoint('mission', { lat: 1, lon: 1 })

    store().finishUpload('mission', uploadId, { status: 'accepted' })

    expect(store().uploads.mission).toEqual({ status: 'idle' })
    expect(missionIds()).toEqual(['point-1'])
  })
})
