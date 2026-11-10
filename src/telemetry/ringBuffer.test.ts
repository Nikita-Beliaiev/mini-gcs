import { describe, expect, it } from 'vitest'
import { RingBuffer } from './ringBuffer'

function bufferWith(capacity: number, items: number[]): RingBuffer<number> {
  const buffer = new RingBuffer<number>(capacity)
  for (const item of items) {
    buffer.push(item)
  }
  return buffer
}

describe('RingBuffer', () => {
  it('starts empty', () => {
    const buffer = new RingBuffer<number>(3)

    expect(buffer.size).toBe(0)
    expect(buffer.toArray()).toEqual([])
  })

  it('keeps items in insertion order while below capacity', () => {
    const buffer = bufferWith(3, [1, 2])

    expect(buffer.size).toBe(2)
    expect(buffer.toArray()).toEqual([1, 2])
  })

  it('overwrites the oldest items once full', () => {
    const buffer = bufferWith(3, [1, 2, 3, 4, 5])

    expect(buffer.size).toBe(3)
    expect(buffer.toArray()).toEqual([3, 4, 5])
  })

  it('stays in order after wrapping around many times', () => {
    const buffer = bufferWith(
      4,
      Array.from({ length: 23 }, (_, index) => index),
    )

    expect(buffer.toArray()).toEqual([19, 20, 21, 22])
  })

  it('returns a copy that does not change with later pushes', () => {
    const buffer = bufferWith(2, [1, 2])
    const snapshot = buffer.toArray()

    buffer.push(3)

    expect(snapshot).toEqual([1, 2])
  })

  it('can be cleared and reused', () => {
    const buffer = bufferWith(2, [1, 2, 3])

    buffer.clear()
    buffer.push(4)

    expect(buffer.toArray()).toEqual([4])
  })

  it.each([0, -1, 1.5, Number.NaN])('rejects capacity %d', (capacity) => {
    expect(() => new RingBuffer<number>(capacity)).toThrow(RangeError)
  })
})
