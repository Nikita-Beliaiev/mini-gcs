import ms from 'milsymbol'
import { describe, expect, it } from 'vitest'
import { AFFILIATIONS, MARK_KINDS, type MarkSymbol } from './mark'
import { cotType, readCotType, symbolCode } from './markCodes'

const ALL_SYMBOLS: MarkSymbol[] = AFFILIATIONS.flatMap((affiliation) =>
  MARK_KINDS.map((kind) => ({ affiliation, kind })),
)

describe('symbolCode', () => {
  it('builds a 15-character letter code from the affiliation and the kind', () => {
    expect(symbolCode({ affiliation: 'hostile', kind: 'infantry' })).toBe('SHGPUCI--------')
    expect(symbolCode({ affiliation: 'friend', kind: 'ground' })).toBe('SFGP-----------')
    expect(symbolCode({ affiliation: 'unknown', kind: 'uav' })).toBe('SUAPMFQ--------')
  })

  it('gives milsymbol a valid APP-6 code for every mark', () => {
    for (const symbol of ALL_SYMBOLS) {
      const code = symbolCode(symbol)
      expect(code).toHaveLength(15)
      expect(new ms.Symbol(code, { standard: 'APP6' }).isValid(), code).toBe(true)
    }
  })
})

describe('cotType', () => {
  it('spells the letter code as a Cursor on Target atom type', () => {
    expect(cotType({ affiliation: 'hostile', kind: 'infantry' })).toBe('a-h-G-U-C-I')
    expect(cotType({ affiliation: 'neutral', kind: 'vehicle' })).toBe('a-n-G-E-V')
    expect(cotType({ affiliation: 'friend', kind: 'ground' })).toBe('a-f-G')
    expect(cotType({ affiliation: 'unknown', kind: 'uav' })).toBe('a-u-A-M-F-Q')
  })
})

describe('readCotType', () => {
  it('reads back every type the station writes', () => {
    for (const symbol of ALL_SYMBOLS) {
      expect(readCotType(cotType(symbol))).toEqual(symbol)
    }
  })

  it('takes the most specific symbol the station knows', () => {
    expect(readCotType('a-h-G-U-C-I-Z')).toEqual({ affiliation: 'hostile', kind: 'infantry' })
    expect(readCotType('a-h-G-E-V-A-T')).toEqual({ affiliation: 'hostile', kind: 'vehicle' })
    expect(readCotType('a-f-G-U-C-R')).toEqual({ affiliation: 'friend', kind: 'ground' })
    expect(readCotType('a-n-A-C-F')).toEqual({ affiliation: 'neutral', kind: 'ground' })
  })

  it('folds assumed, suspect and pending identities into the four affiliations', () => {
    expect(readCotType('a-a-G')?.affiliation).toBe('friend')
    expect(readCotType('a-s-G')?.affiliation).toBe('hostile')
    expect(readCotType('a-p-G')?.affiliation).toBe('unknown')
  })

  it('refuses events that are not atoms or have no known affiliation', () => {
    expect(readCotType('b-m-p-s-p-i')).toBeNull()
    expect(readCotType('a-x-G')).toBeNull()
    expect(readCotType('a-constructor-G')).toBeNull()
    expect(readCotType('')).toBeNull()
  })
})
