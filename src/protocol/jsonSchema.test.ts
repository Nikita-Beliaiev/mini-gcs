import { describe, expect, it } from 'vitest'
import committedSchema from '../../bridge/contract/station-protocol.schema.json'
import { protocolJsonSchema } from './jsonSchema'

describe('protocolJsonSchema', () => {
  it('matches the schema the Python bridge is tested against', () => {
    expect(committedSchema, 'Run npm run protocol:schema and commit the result').toEqual(
      protocolJsonSchema(),
    )
  })
})
