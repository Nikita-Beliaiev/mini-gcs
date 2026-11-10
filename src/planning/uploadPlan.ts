import type { Command } from '../protocol/commands'
import type { SendCommand } from '../station/commandSender'
import { usePlanningStore, type PlanTarget, type UploadState } from './planningStore'

export async function uploadPlan(
  sendCommand: SendCommand,
  target: PlanTarget,
  command: Command,
): Promise<void> {
  const uploadId = usePlanningStore.getState().startUpload(target)
  const result = await sendCommand(command)
  usePlanningStore.getState().finishUpload(target, uploadId, result)
}

export function describeUpload(upload: UploadState): string | null {
  switch (upload.status) {
    case 'idle':
      return null
    case 'pending':
      return 'Uploading…'
    case 'accepted':
      return 'Accepted by the vehicle'
    case 'rejected':
      return `Rejected: ${upload.reason}`
    case 'noResponse':
      return 'No response from the vehicle'
  }
}
