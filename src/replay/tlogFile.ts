import { MAX_FLIGHT_LOG_BYTES, type FlightLogResult } from './flightLog'

export interface TlogWorkerLike {
  onmessage: ((event: MessageEvent<FlightLogResult>) => void) | null
  onerror: ((event: ErrorEvent) => void) | null
  postMessage: (buffer: ArrayBuffer, transfer: Transferable[]) => void
  terminate: () => void
}

function createTlogWorker(): TlogWorkerLike {
  return new Worker(new URL('../mavlink/tlog.worker.ts', import.meta.url), { type: 'module' })
}

export function isTlogFileName(name: string): boolean {
  return name.toLowerCase().endsWith('.tlog')
}

export async function readTlogFile(
  file: Blob,
  createWorker: () => TlogWorkerLike = createTlogWorker,
  maxBytes = MAX_FLIGHT_LOG_BYTES,
): Promise<FlightLogResult> {
  if (file.size > maxBytes) {
    return { ok: false, error: 'tooLarge' }
  }
  const buffer = await file.arrayBuffer()
  return new Promise((resolve) => {
    const worker = createWorker()
    worker.onmessage = (event) => {
      worker.terminate()
      resolve(event.data)
    }
    worker.onerror = () => {
      worker.terminate()
      resolve({ ok: false, error: 'notTlog' })
    }
    worker.postMessage(buffer, [buffer])
  })
}
