declare module 'gifenc' {
  type Palette = number[][]

  interface FrameOptions {
    palette?: Palette
    delay?: number
    repeat?: number
  }

  interface GifEncoder {
    writeFrame: (index: Uint8Array, width: number, height: number, options?: FrameOptions) => void
    finish: () => void
    bytes: () => Uint8Array
  }

  const gifenc: {
    GIFEncoder: () => GifEncoder
    quantize: (rgba: Uint8Array, maxColors: number) => Palette
    applyPalette: (rgba: Uint8Array, palette: Palette) => Uint8Array
  }

  export default gifenc
}
