import type { Command } from '../protocol/commands'
import type { Transport } from '../transport/transport'

export type CommandResult =
  { status: 'accepted' } | { status: 'rejected'; reason: string } | { status: 'noResponse' }

export type SendCommand = (command: Command) => Promise<CommandResult>

export const DEFAULT_COMMAND_TIMEOUT_MS = 3000

export function createCommandSender(
  transport: Transport,
  timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS,
): SendCommand {
  const pending = new Map<number, (result: CommandResult) => void>()
  let nextCommandId = 1

  transport.subscribeMessages((message) => {
    if (message.type !== 'commandAck') {
      return
    }
    const settle = pending.get(message.commandId)
    settle?.(
      message.accepted
        ? { status: 'accepted' }
        : { status: 'rejected', reason: message.reason ?? 'Rejected by the vehicle' },
    )
  })

  return (command) => {
    const commandId = nextCommandId
    nextCommandId += 1

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        settle({ status: 'noResponse' })
      }, timeoutMs)

      function settle(result: CommandResult): void {
        clearTimeout(timer)
        pending.delete(commandId)
        resolve(result)
      }

      pending.set(commandId, settle)
      transport.send({ commandId, command })
    })
  }
}
