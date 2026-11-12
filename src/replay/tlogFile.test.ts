import { describe, expect, it, vi } from 'vitest'
import { heartbeatMessage } from '../test/messages'
import type { FlightLogResult } from './flightLog'
import { isTlogFileName, readTlogFile, type TlogWorkerLike } from './tlogFile'

function createFakeWorker() {
  const posted: { buffer: ArrayBuffer; transfer: Transferable[] }[] = []
  const worker: TlogWorkerLike = {
    onmessage: null,
    onerror: null,
    postMessage: (buffer, transfer) => {
      posted.push({ buffer, transfer })
    },
    terminate: vi.fn(),
  }
  return {
    worker,
    posted,
    reply: (result: FlightLogResult) => {
      worker.onmessage?.(new MessageEvent('message', { data: result }))
    },
    fail: () => {
      worker.onerror?.(new ErrorEvent('error'))
    },
  }
}

const parsed: FlightLogResult = {
  ok: true,
  log: { savedAt: '2026-11-12T10:00:00.000Z', messages: [heartbeatMessage()] },
}

describe('isTlogFileName', () => {
  it('recognises MAVLink telemetry logs by their extension', () => {
    expect(isTlogFileName('2026-11-12 10-00-00.TLOG')).toBe(true)
    expect(isTlogFileName('flight.json')).toBe(false)
  })
})

describe('readTlogFile', () => {
  it('hands the file to a worker without copying it and returns its answer', async () => {
    const fake = createFakeWorker()

    const reading = readTlogFile(new Blob([new Uint8Array([1, 2, 3])]), () => fake.worker)
    await vi.waitFor(() => {
      expect(fake.posted).toHaveLength(1)
    })
    const [message] = fake.posted
    expect(message?.transfer).toEqual([message?.buffer])
    fake.reply(parsed)

    await expect(reading).resolves.toEqual(parsed)
    expect(fake.worker.terminate).toHaveBeenCalledOnce()
  })

  it('reports a worker failure as a file it cannot read', async () => {
    const fake = createFakeWorker()

    const reading = readTlogFile(new Blob([new Uint8Array([1])]), () => fake.worker)
    await vi.waitFor(() => {
      expect(fake.posted).toHaveLength(1)
    })
    fake.fail()

    await expect(reading).resolves.toEqual({ ok: false, error: 'notTlog' })
    expect(fake.worker.terminate).toHaveBeenCalledOnce()
  })

  it('refuses a file that is too large before starting a worker', async () => {
    const createWorker = vi.fn(() => createFakeWorker().worker)

    const result = await readTlogFile(new Blob([new Uint8Array(10)]), createWorker, 9)

    expect(result).toEqual({ ok: false, error: 'tooLarge' })
    expect(createWorker).not.toHaveBeenCalled()
  })
})
