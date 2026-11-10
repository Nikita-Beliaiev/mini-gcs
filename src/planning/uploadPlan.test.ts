import { describe, expect, it, vi } from 'vitest'
import type { CommandResult } from '../station/commandSender'
import { usePlanningStore } from './planningStore'
import { describeUpload, uploadPlan } from './uploadPlan'

describe('uploadPlan', () => {
  it('sends the command and stores the answer', async () => {
    let answer: (result: CommandResult) => void = () => undefined
    const sendCommand = vi.fn(
      () =>
        new Promise<CommandResult>((resolve) => {
          answer = resolve
        }),
    )

    const upload = uploadPlan(sendCommand, 'geofence', { type: 'clearGeofence' })
    expect(sendCommand).toHaveBeenCalledWith({ type: 'clearGeofence' })
    expect(usePlanningStore.getState().uploads.geofence.status).toBe('pending')

    answer({ status: 'accepted' })
    await upload

    expect(usePlanningStore.getState().uploads.geofence).toEqual({ status: 'accepted' })
  })
})

describe('describeUpload', () => {
  it.each([
    [{ status: 'idle' } as const, null],
    [{ status: 'pending', uploadId: 1 } as const, 'Uploading…'],
    [{ status: 'accepted' } as const, 'Accepted by the vehicle'],
    [{ status: 'rejected', reason: 'Too far' } as const, 'Rejected: Too far'],
    [{ status: 'noResponse' } as const, 'No response from the vehicle'],
  ])('describes %o', (upload, text) => {
    expect(describeUpload(upload)).toBe(text)
  })
})
