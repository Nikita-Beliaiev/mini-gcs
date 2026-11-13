import { describe, expect, it } from 'vitest'
import { DEMO_HOME } from '../simulator/demoArea'
import {
  decodeTerrariumPixels,
  sampleHeight,
  TERRAIN_TILE_SIZE,
  terrainTileUrl,
  terrariumHeight,
  tilePixelAt,
} from './terrarium'

function tileWithHeights(height: (column: number, row: number) => number): Float32Array {
  const heights = new Float32Array(TERRAIN_TILE_SIZE * TERRAIN_TILE_SIZE)
  for (let row = 0; row < TERRAIN_TILE_SIZE; row += 1) {
    for (let column = 0; column < TERRAIN_TILE_SIZE; column += 1) {
      heights[row * TERRAIN_TILE_SIZE + column] = height(column, row)
    }
  }
  return heights
}

describe('terrariumHeight', () => {
  it.each([
    [128, 0, 0, 0],
    [129, 44, 0, 300],
    [127, 255, 128, -0.5],
    [132, 165, 192, 1189.75],
  ])('decodes red %d, green %d, blue %d as %d m', (red, green, blue, height) => {
    expect(terrariumHeight(red, green, blue)).toBe(height)
  })
})

describe('decodeTerrariumPixels', () => {
  it('turns RGBA pixels into heights and ignores alpha', () => {
    const pixels = new Uint8ClampedArray([128, 0, 0, 255, 129, 44, 0, 0])

    expect(Array.from(decodeTerrariumPixels(pixels))).toEqual([0, 300])
  })
})

describe('tilePixelAt', () => {
  it('finds the pixel of a point in a Web Mercator tile', () => {
    expect(tilePixelAt({ lat: 0, lon: 0 }, 1)).toEqual({
      tile: { zoom: 1, x: 1, y: 1 },
      column: 0,
      row: 0,
    })
  })

  it('finds the tile of the demo home', () => {
    const { tile, column, row } = tilePixelAt(DEMO_HOME, 13)

    expect(tile).toEqual({ zoom: 13, x: 4360, y: 3007 })
    expect(column).toBeGreaterThanOrEqual(0)
    expect(column).toBeLessThan(TERRAIN_TILE_SIZE)
    expect(row).toBeGreaterThanOrEqual(0)
    expect(row).toBeLessThan(TERRAIN_TILE_SIZE)
  })
})

describe('terrainTileUrl', () => {
  it('fills the tile address into the URL', () => {
    expect(terrainTileUrl({ zoom: 13, x: 4360, y: 3007 })).toBe(
      'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/13/4360/3007.png',
    )
  })
})

describe('sampleHeight', () => {
  const slope = tileWithHeights((column, row) => column + 1000 * row)

  it('returns the height at a pixel centre', () => {
    expect(sampleHeight(slope, 10.5, 3.5)).toBe(3010)
  })

  it('interpolates between pixel centres', () => {
    expect(sampleHeight(slope, 11, 3.5)).toBe(3010.5)
    expect(sampleHeight(slope, 10.5, 4)).toBe(3510)
  })

  it('uses the edge pixels at the border of a tile', () => {
    expect(sampleHeight(slope, 0, 0)).toBe(0)
    expect(sampleHeight(slope, TERRAIN_TILE_SIZE, TERRAIN_TILE_SIZE)).toBe(255 + 1000 * 255)
  })
})
