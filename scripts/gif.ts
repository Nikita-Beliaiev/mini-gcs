import gifenc from 'gifenc'
import { PNG } from 'pngjs'

const { applyPalette, GIFEncoder, quantize } = gifenc

export interface Frame {
  png: Buffer
  capturedAtMs: number
}

const MAX_COLORS = 128
const LAST_FRAME_DELAY_MS = 1500

export function encodeGif(frames: readonly Frame[]): Uint8Array {
  const encoder = GIFEncoder()

  frames.forEach((frame, index) => {
    const image = PNG.sync.read(frame.png)
    const rgba = new Uint8Array(image.data)
    const palette = quantize(rgba, MAX_COLORS)
    const next = frames[index + 1]
    encoder.writeFrame(applyPalette(rgba, palette), image.width, image.height, {
      palette,
      delay: next ? next.capturedAtMs - frame.capturedAtMs : LAST_FRAME_DELAY_MS,
    })
  })

  encoder.finish()
  return encoder.bytes()
}
