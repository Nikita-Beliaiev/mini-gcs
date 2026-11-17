import { z } from 'zod'
import { AREA_MANIFEST_FILE } from './area'
import { AREA_CACHE } from './areaCache'
import { areaFileUrl } from './areaFiles'

const areaManifestSchema = z.object({
  builtAt: z.string(),
  files: z
    .array(z.object({ path: z.string().min(1), bytes: z.number().int().nonnegative() }))
    .min(1),
})

export type AreaManifest = z.infer<typeof areaManifestSchema>

export type AreaStatus =
  | { kind: 'saved'; manifest: AreaManifest }
  | { kind: 'notSaved'; manifest: AreaManifest }
  | { kind: 'unavailable' }

interface AreaCache {
  match: (url: string) => Promise<Response | undefined>
  put: (url: string, response: Response) => Promise<void>
}

export interface AreaStorageEnvironment {
  caches: {
    open: (name: string) => Promise<AreaCache>
    delete: (name: string) => Promise<boolean>
  }
  fetch: (url: string) => Promise<Response>
  persist: () => Promise<boolean>
}

export function browserAreaStorage(): AreaStorageEnvironment {
  return {
    caches: window.caches,
    fetch: (url) => window.fetch(url),
    persist: () => navigator.storage.persist(),
  }
}

export function areaBytes(manifest: AreaManifest): number {
  return manifest.files.reduce((sum, file) => sum + file.bytes, 0)
}

async function readManifest(response: Response | undefined): Promise<AreaManifest | null> {
  if (!response?.ok) {
    return null
  }
  const parsed = areaManifestSchema.safeParse(await response.json().catch(() => null))
  return parsed.success ? parsed.data : null
}

export async function readAreaStatus(environment: AreaStorageEnvironment): Promise<AreaStatus> {
  const cache = await environment.caches.open(AREA_CACHE)
  const saved = await readManifest(await cache.match(areaFileUrl(AREA_MANIFEST_FILE)))
  if (saved) {
    const matches = await Promise.all(
      saved.files.map((file) => cache.match(areaFileUrl(file.path))),
    )
    if (matches.every(Boolean)) {
      return { kind: 'saved', manifest: saved }
    }
  }
  try {
    const manifest = await readManifest(await environment.fetch(areaFileUrl(AREA_MANIFEST_FILE)))
    return manifest ? { kind: 'notSaved', manifest } : { kind: 'unavailable' }
  } catch {
    return { kind: 'unavailable' }
  }
}

export async function saveArea(
  manifest: AreaManifest,
  onProgress: (savedBytes: number) => void,
  environment: AreaStorageEnvironment,
): Promise<void> {
  await environment.persist().catch(() => false)
  const cache = await environment.caches.open(AREA_CACHE)
  let savedBytes = 0
  for (const file of manifest.files) {
    const url = areaFileUrl(file.path)
    const response = await environment.fetch(url)
    if (!response.ok) {
      throw new Error(`${file.path} answered HTTP ${String(response.status)}`)
    }
    await cache.put(url, response)
    savedBytes += file.bytes
    onProgress(savedBytes)
  }
  await cache.put(
    areaFileUrl(AREA_MANIFEST_FILE),
    new Response(JSON.stringify(manifest), { headers: { 'Content-Type': 'application/json' } }),
  )
}

export async function removeArea(environment: AreaStorageEnvironment): Promise<void> {
  await environment.caches.delete(AREA_CACHE)
}
