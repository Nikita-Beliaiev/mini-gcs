import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, relative } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import {
  AREA_DIRECTORY,
  AREA_MANIFEST_FILE,
  AREA_MAP_FILE,
  AREA_MAP_MAX_ZOOM,
  AREA_TERRAIN_FILE,
  AREA_TERRAIN_MAX_ZOOM,
  boundsText,
  DEMO_AREA_BOUNDS,
  tilesCovering,
} from '../src/offline/area'
import { terrainTileUrl } from '../src/terrain/terrarium'

const PROTOMAPS_BUILD = 'https://build.protomaps.com/20261116.pmtiles'
const ASSETS_URL = 'https://protomaps.github.io/basemaps-assets'
const FONTS = ['Noto Sans Regular', 'Noto Sans Medium', 'Noto Sans Italic']
const GLYPH_RANGES = ['0-255', '256-511', '1024-1279', '8192-8447']
const SPRITE_FILES = ['dark', 'light'].flatMap((flavor) => [
  `${flavor}.json`,
  `${flavor}.png`,
  `${flavor}@2x.json`,
  `${flavor}@2x.png`,
])
const TERRAIN_ATTRIBUTION = 'Terrain: Mapzen, Copernicus EU-DEM, USGS, NOAA'
const OUTPUT_DIRECTORY = join('public', AREA_DIRECTORY)
const PMTILES = process.env.PMTILES_BIN ?? 'pmtiles'

async function download(url: string): Promise<Uint8Array> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`${url} answered HTTP ${String(response.status)}`)
  }
  return new Uint8Array(await response.arrayBuffer())
}

async function saveDownload(url: string, path: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, await download(url))
}

function assetUrl(...segments: string[]): string {
  return [ASSETS_URL, ...segments.map(encodeURIComponent)].join('/')
}

function extractMap(): void {
  execFileSync(
    PMTILES,
    [
      'extract',
      PROTOMAPS_BUILD,
      join(OUTPUT_DIRECTORY, AREA_MAP_FILE),
      `--bbox=${boundsText(DEMO_AREA_BOUNDS)}`,
      `--maxzoom=${String(AREA_MAP_MAX_ZOOM)}`,
    ],
    { stdio: 'inherit' },
  )
}

async function writeTerrainMbtiles(path: string): Promise<number> {
  const database = new DatabaseSync(path)
  database.exec(
    'CREATE TABLE metadata (name TEXT, value TEXT);' +
      'CREATE TABLE tiles (zoom_level INTEGER, tile_column INTEGER, tile_row INTEGER, tile_data BLOB);',
  )
  const metadata = {
    name: 'Val d’Orcia terrain',
    format: 'png',
    type: 'baselayer',
    minzoom: '0',
    maxzoom: String(AREA_TERRAIN_MAX_ZOOM),
    bounds: boundsText(DEMO_AREA_BOUNDS),
    attribution: TERRAIN_ATTRIBUTION,
  }
  const insertMetadata = database.prepare('INSERT INTO metadata VALUES (?, ?)')
  for (const [name, value] of Object.entries(metadata)) {
    insertMetadata.run(name, value)
  }
  const insertTile = database.prepare('INSERT INTO tiles VALUES (?, ?, ?, ?)')
  let count = 0
  for (let zoom = 0; zoom <= AREA_TERRAIN_MAX_ZOOM; zoom += 1) {
    for (const tile of tilesCovering(DEMO_AREA_BOUNDS, zoom)) {
      const rowFromBottom = 2 ** zoom - 1 - tile.y
      insertTile.run(zoom, tile.x, rowFromBottom, await download(terrainTileUrl(tile)))
      count += 1
    }
  }
  database.close()
  return count
}

async function buildTerrain(): Promise<void> {
  const workDirectory = await mkdtemp(join(tmpdir(), 'mini-gcs-terrain-'))
  try {
    const mbtiles = join(workDirectory, 'terrain.mbtiles')
    const count = await writeTerrainMbtiles(mbtiles)
    console.log(`Downloaded ${String(count)} terrain tiles`)
    execFileSync(PMTILES, ['convert', mbtiles, join(OUTPUT_DIRECTORY, AREA_TERRAIN_FILE)], {
      stdio: 'inherit',
    })
  } finally {
    await rm(workDirectory, { recursive: true, force: true })
  }
}

async function saveStyleAssets(): Promise<void> {
  for (const font of FONTS) {
    for (const range of GLYPH_RANGES) {
      const file = `${range}.pbf`
      await saveDownload(assetUrl('fonts', font, file), join(OUTPUT_DIRECTORY, 'fonts', font, file))
    }
  }
  await saveDownload(assetUrl('fonts', 'OFL.txt'), join(OUTPUT_DIRECTORY, 'fonts', 'OFL.txt'))
  for (const file of SPRITE_FILES) {
    await saveDownload(assetUrl('sprites', 'v4', file), join(OUTPUT_DIRECTORY, 'sprites', file))
  }
}

async function listFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { recursive: true, withFileTypes: true })
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => relative(OUTPUT_DIRECTORY, join(entry.parentPath, entry.name)))
    .map((path) => path.split('\\').join('/'))
    .filter((path) => path !== AREA_MANIFEST_FILE && !path.endsWith('.txt'))
    .sort()
}

async function writeManifest(): Promise<void> {
  const files = await Promise.all(
    (await listFiles(OUTPUT_DIRECTORY)).map(async (path) => ({
      path,
      bytes: (await stat(join(OUTPUT_DIRECTORY, path))).size,
    })),
  )
  const manifest = { builtAt: new Date().toISOString().slice(0, 10), files }
  await writeFile(
    join(OUTPUT_DIRECTORY, AREA_MANIFEST_FILE),
    `${JSON.stringify(manifest, null, 2)}\n`,
  )
  const totalBytes = files.reduce((sum, file) => sum + file.bytes, 0)
  console.log(`Wrote ${String(files.length)} files, ${(totalBytes / 1e6).toFixed(1)} MB`)
}

await rm(OUTPUT_DIRECTORY, { recursive: true, force: true })
await mkdir(OUTPUT_DIRECTORY, { recursive: true })
extractMap()
await buildTerrain()
await saveStyleAssets()
await writeManifest()
