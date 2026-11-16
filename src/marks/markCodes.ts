import { MARK_KINDS, type Affiliation, type MarkKind, type MarkSymbol } from './mark'

type Dimension = 'G' | 'A'

interface SymbolFunction {
  dimension: Dimension
  functionPath: readonly string[]
}

const AFFILIATION_CODES: Record<Affiliation, string> = {
  friend: 'F',
  hostile: 'H',
  neutral: 'N',
  unknown: 'U',
}

const KIND_FUNCTIONS: Record<MarkKind, SymbolFunction> = {
  ground: { dimension: 'G', functionPath: [] },
  infantry: { dimension: 'G', functionPath: ['U', 'C', 'I'] },
  armour: { dimension: 'G', functionPath: ['U', 'C', 'A'] },
  artillery: { dimension: 'G', functionPath: ['U', 'C', 'F'] },
  vehicle: { dimension: 'G', functionPath: ['E', 'V'] },
  uav: { dimension: 'A', functionPath: ['M', 'F', 'Q'] },
}

const COT_AFFILIATIONS = new Map<string, Affiliation>([
  ['f', 'friend'],
  ['a', 'friend'],
  ['h', 'hostile'],
  ['s', 'hostile'],
  ['j', 'hostile'],
  ['k', 'hostile'],
  ['n', 'neutral'],
  ['u', 'unknown'],
  ['p', 'unknown'],
  ['o', 'unknown'],
])

const KINDS_MOST_SPECIFIC_FIRST = MARK_KINDS.toSorted(
  (first, second) =>
    KIND_FUNCTIONS[second].functionPath.length - KIND_FUNCTIONS[first].functionPath.length,
)

export function symbolCode({ affiliation, kind }: MarkSymbol): string {
  const { dimension, functionPath } = KIND_FUNCTIONS[kind]
  const functionId = functionPath.join('').padEnd(6, '-')
  return `S${AFFILIATION_CODES[affiliation]}${dimension}P${functionId}-----`
}

export function cotType({ affiliation, kind }: MarkSymbol): string {
  const { dimension, functionPath } = KIND_FUNCTIONS[kind]
  return ['a', AFFILIATION_CODES[affiliation].toLowerCase(), dimension, ...functionPath].join('-')
}

export function readCotType(type: string): MarkSymbol | null {
  const [atom, affiliationCode = '', dimension = '', ...functionParts] = type.split('-')
  const affiliation = COT_AFFILIATIONS.get(affiliationCode)
  if (atom !== 'a' || !affiliation) {
    return null
  }
  const kind = KINDS_MOST_SPECIFIC_FIRST.find((candidate) => {
    const { dimension: candidateDimension, functionPath } = KIND_FUNCTIONS[candidate]
    return (
      candidateDimension === dimension &&
      functionPath.every((letter, index) => functionParts[index] === letter)
    )
  })
  return { affiliation, kind: kind ?? 'ground' }
}
