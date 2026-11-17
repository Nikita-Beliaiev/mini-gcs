import type { AreaStorageEnvironment } from '../offline/areaStorage'

export interface FakeAreaStorage extends AreaStorageEnvironment {
  stored: (cacheName: string) => string[]
  requests: string[]
  persisted: boolean
}

export function fakeAreaStorage(serve: (url: string) => Response | null): FakeAreaStorage {
  const caches = new Map<string, Map<string, Response>>()
  const storage: FakeAreaStorage = {
    requests: [],
    persisted: false,
    stored: (cacheName) => [...(caches.get(cacheName)?.keys() ?? [])],
    caches: {
      open: (name) => {
        const entries = caches.get(name) ?? new Map<string, Response>()
        caches.set(name, entries)
        return Promise.resolve({
          match: (url) => Promise.resolve(entries.get(url)?.clone()),
          put: (url, response) => {
            entries.set(url, response)
            return Promise.resolve()
          },
        })
      },
      delete: (name) => Promise.resolve(caches.delete(name)),
    },
    fetch: (url) => {
      storage.requests.push(url)
      const response = serve(url)
      return response ? Promise.resolve(response) : Promise.reject(new TypeError('Failed to fetch'))
    },
    persist: () => {
      storage.persisted = true
      return Promise.resolve(true)
    },
  }
  return storage
}
