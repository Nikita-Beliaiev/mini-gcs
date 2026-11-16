import type { MarkSymbol } from './mark'
import { SYMBOL_SIZE, useSymbolImages } from './symbolLoader'
import styles from './SymbolIcon.module.css'

interface SymbolIconProps {
  symbol: MarkSymbol
}

export function SymbolIcon({ symbol }: SymbolIconProps) {
  const images = useSymbolImages()
  const image = images?.symbolImage(symbol, SYMBOL_SIZE)

  return (
    <span className={styles.icon}>
      {image ? <img src={image.url} width={image.width} height={image.height} alt="" /> : null}
    </span>
  )
}
