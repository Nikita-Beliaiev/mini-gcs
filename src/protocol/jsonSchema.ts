import { z } from 'zod'
import { commandEnvelopeSchema } from './commands'
import { telemetryMessageSchema } from './telemetry'

export function protocolJsonSchema() {
  return {
    $comment:
      'Generated from the Zod schemas in src/protocol by npm run protocol:schema. Do not edit by hand.',
    telemetryMessage: z.toJSONSchema(telemetryMessageSchema),
    commandEnvelope: z.toJSONSchema(commandEnvelopeSchema),
  }
}
