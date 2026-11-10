export class RingBuffer<T> {
  readonly capacity: number
  #items: T[] = []
  #oldestIndex = 0

  constructor(capacity: number) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new RangeError(
        `Ring buffer capacity must be a positive integer, got ${String(capacity)}`,
      )
    }
    this.capacity = capacity
  }

  get size(): number {
    return this.#items.length
  }

  push(item: T): void {
    if (this.#items.length < this.capacity) {
      this.#items.push(item)
      return
    }
    this.#items[this.#oldestIndex] = item
    this.#oldestIndex = (this.#oldestIndex + 1) % this.capacity
  }

  toArray(): T[] {
    return [...this.#items.slice(this.#oldestIndex), ...this.#items.slice(0, this.#oldestIndex)]
  }

  clear(): void {
    this.#items = []
    this.#oldestIndex = 0
  }
}
