import { describe, expect, it, vi } from 'vitest'
import { attitudeMessage, commandAckMessage, heartbeatMessage } from '../test/messages'
import { createFlightRecorder } from './flightRecorder'

function attitudesEvery(stepMs: number, count: number) {
  return Array.from({ length: count }, (_, index) => attitudeMessage({ timeMs: index * stepMs }))
}

describe('flight recorder', () => {
  it('keeps telemetry in the order it arrived, without command answers', () => {
    const recorder = createFlightRecorder()
    const heartbeat = heartbeatMessage({ timeMs: 0 })
    const attitude = attitudeMessage({ timeMs: 20 })

    recorder.record(heartbeat)
    recorder.record(commandAckMessage({ timeMs: 10 }))
    recorder.record(attitude)

    expect(recorder.getMessages()).toEqual([heartbeat, attitude])
    expect(recorder.getMessageCount()).toBe(2)
    expect(recorder.getDurationMs()).toBe(20)
  })

  it('keeps only the most recent window of telemetry', () => {
    const recorder = createFlightRecorder(1000)
    const messages = attitudesEvery(500, 4)

    for (const message of messages) {
      recorder.record(message)
    }

    expect(recorder.getMessages()).toEqual(messages.slice(1))
    expect(recorder.getDurationMs()).toBe(1000)
  })

  it('stays correct over a long flight', () => {
    const recorder = createFlightRecorder(1000)
    const messages = attitudesEvery(10, 10_000)

    for (const message of messages) {
      recorder.record(message)
    }

    expect(recorder.getMessages()).toEqual(messages.slice(-101))
    expect(recorder.getMessageCount()).toBe(101)
  })

  it('starts over when the simulation restarts and time goes back', () => {
    const recorder = createFlightRecorder()
    const restarted = heartbeatMessage({ timeMs: 0 })

    recorder.record(heartbeatMessage({ timeMs: 5000 }))
    recorder.record(restarted)

    expect(recorder.getMessages()).toEqual([restarted])
  })

  it('reports an empty recording before anything arrives', () => {
    const recorder = createFlightRecorder()

    expect(recorder.getMessages()).toEqual([])
    expect(recorder.getMessageCount()).toBe(0)
    expect(recorder.getDurationMs()).toBe(0)
  })

  it('tells subscribers about every recorded message', () => {
    const recorder = createFlightRecorder()
    const listener = vi.fn()
    const unsubscribe = recorder.subscribe(listener)

    recorder.record(heartbeatMessage())
    unsubscribe()
    recorder.record(heartbeatMessage({ timeMs: 1000 }))

    expect(listener).toHaveBeenCalledTimes(1)
  })
})
