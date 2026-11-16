import { describe, expect, it } from 'vitest'
import { symbolImage } from './symbolImages'

describe('symbolImage', () => {
  it('draws the APP-6 symbol as an SVG image with the point it stands on', () => {
    const image = symbolImage({ affiliation: 'hostile', kind: 'infantry' }, 24)

    expect(image.url).toMatch(/^data:image\/svg\+xml/)
    expect(image.width).toBeGreaterThan(24)
    expect(image.anchor.x).toBeCloseTo(image.width / 2)
    expect(image.anchor.y).toBeCloseTo(image.height / 2)
  })

  it('draws a hostile diamond larger than a friendly rectangle of the same size', () => {
    const hostile = symbolImage({ affiliation: 'hostile', kind: 'ground' }, 24)
    const friend = symbolImage({ affiliation: 'friend', kind: 'ground' }, 24)

    expect(hostile.height).toBeGreaterThan(friend.height)
  })
})
