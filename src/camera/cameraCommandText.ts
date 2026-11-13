import type { Messages } from '../i18n/en'
import type { CommandResult } from '../station/commandSender'

export function describeCameraCommand(
  result: CommandResult,
  success: string,
  messages: Messages,
): string {
  switch (result.status) {
    case 'accepted':
      return success
    case 'rejected':
      return result.reason === null
        ? messages.planning.upload.rejectedByVehicle
        : messages.planning.upload.rejected(result.reason)
    case 'noResponse':
      return messages.planning.upload.noResponse
  }
}
