import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { protocolJsonSchema } from '../src/protocol/jsonSchema'

const output = resolve(import.meta.dirname, '../bridge/contract/station-protocol.schema.json')
writeFileSync(output, `${JSON.stringify(protocolJsonSchema(), null, 2)}\n`)
console.log(`Wrote ${output}`)
