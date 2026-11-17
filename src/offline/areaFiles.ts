import { AREA_DIRECTORY } from './area'

export function areaBaseUrl(): string {
  return new URL(`${AREA_DIRECTORY}/`, document.baseURI).href
}

export function areaFileUrl(path: string, base = areaBaseUrl()): string {
  return new URL(path, base).href
}
