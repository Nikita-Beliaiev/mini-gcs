import { useEffect, useState } from 'react'
import type * as SymbolImages from './symbolImages'

export type SymbolImagesModule = typeof SymbolImages

export const SYMBOL_SIZE = 24

let loaded: SymbolImagesModule | null = null
let loading: Promise<SymbolImagesModule> | null = null

export function loadSymbolImages(): Promise<SymbolImagesModule> {
  loading ??= import('./symbolImages').then(
    (module) => {
      loaded = module
      return module
    },
    (error: unknown) => {
      loading = null
      throw error
    },
  )
  return loading
}

export function useSymbolImages(): SymbolImagesModule | null {
  const [images, setImages] = useState(loaded)

  useEffect(() => {
    if (images) {
      return
    }
    let active = true
    loadSymbolImages().then(
      (module) => {
        if (active) {
          setImages(module)
        }
      },
      () => undefined,
    )
    return () => {
      active = false
    }
  }, [images])

  return images
}
