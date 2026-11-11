import type { Messages } from '../i18n/en'
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

export function describeUpload(upload: UploadState, messages: Messages): string | null {
  const text = messages.planning.upload
  switch (upload.status) {
    case 'idle':
      return null
    case 'pending':
      return text.pending
    case 'accepted':
      return text.accepted
    case 'rejected':
      return upload.reason === null ? text.rejectedByVehicle : text.rejected(upload.reason)
    case 'noResponse':
      return text.noResponse
  }
}
