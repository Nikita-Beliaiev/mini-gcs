import { describe, expect, it, vi } from 'vitest'
import { createEmitter } from './emitter'

describe('createEmitter', () => {
  it('passes every emitted value to every listener', () => {
    const emitter = createEmitter<number>()
    const first = vi.fn()
    const second = vi.fn()
    emitter.subscribe(first)
    emitter.subscribe(second)

    emitter.emit(1)
    emitter.emit(2)

    expect(first.mock.calls).toEqual([[1], [2]])
    expect(second.mock.calls).toEqual([[1], [2]])
  })

  it('stops calling a listener after it unsubscribes', () => {
    const emitter = createEmitter()
    const listener = vi.fn()
    const unsubscribe = emitter.subscribe(listener)

    emitter.emit()
    unsubscribe()
    emitter.emit()

    expect(listener).toHaveBeenCalledTimes(1)
  })
})
