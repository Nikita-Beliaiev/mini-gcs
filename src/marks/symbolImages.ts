import ms from 'milsymbol'
import type { MarkSymbol } from './mark'
import { symbolCode } from './markCodes'

export interface SymbolImage {
  url: string
  width: number
  height: number
  anchor: { x: number; y: number }
}

const drawnImages = new Map<string, SymbolImage>()

export function symbolImage(symbol: MarkSymbol, size: number): SymbolImage {
  const code = symbolCode(symbol)
  const key = `${code}@${String(size)}`
  const drawn = drawnImages.get(key)
  if (drawn) {
    return drawn
  }
  const milSymbol = new ms.Symbol(code, { size, standard: 'APP6' })
  const { width, height } = milSymbol.getSize()
  const image = { url: milSymbol.toDataURL(), width, height, anchor: milSymbol.getAnchor() }
  drawnImages.set(key, image)
  return image
}
