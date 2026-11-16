import ms from 'milsymbol'
import type { MarkSymbol } from './mark'
import { symbolCode } from './markCodes'

export interface SymbolImage {
  url: string
  width: number
  height: number
  anchor: { x: number; y: number }
}

export function symbolImage(symbol: MarkSymbol, size: number): SymbolImage {
  const drawn = new ms.Symbol(symbolCode(symbol), { size, standard: 'APP6' })
  const { width, height } = drawn.getSize()
  return { url: drawn.toDataURL(), width, height, anchor: drawn.getAnchor() }
}
