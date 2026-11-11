import { vi } from 'vitest'

export interface CapturedDownload {
  fileName: string
  blob: Blob
}

export function captureDownloads(): { downloads: CapturedDownload[]; revoked: string[] } {
  const blobs = new Map<string, Blob>()
  const downloads: CapturedDownload[] = []
  const revoked: string[] = []

  URL.createObjectURL = (blob: Blob) => {
    const url = `blob:test/${String(blobs.size)}`
    blobs.set(url, blob)
    return url
  }
  URL.revokeObjectURL = (url: string) => {
    revoked.push(url)
  }
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    const blob = blobs.get(this.href)
    if (blob) {
      downloads.push({ fileName: this.download, blob })
    }
  })

  return { downloads, revoked }
}
