import { describe, expect, it } from 'vitest'
import { chartWindow } from './chartData'

interface Sample {
  timeMs: number
  a: number
  b: number
}

function samples(times: number[]): Sample[] {
  return times.map((timeMs) => ({ timeMs, a: timeMs / 1000, b: -timeMs / 1000 }))
}

describe('chartWindow', () => {
  it('returns empty columns without history', () => {
    expect(chartWindow<Sample>([], [(sample) => sample.a, (sample) => sample.b])).toEqual([
      [],
      [],
      [],
    ])
  })

  it('measures time in seconds back from the latest sample', () => {
    const [seconds] = chartWindow(samples([1000, 1500, 3000]), [(sample) => sample.a])

    expect(seconds).toEqual([-2, -1.5, 0])
  })

  it('keeps only the samples inside the window', () => {
    const data = chartWindow(samples([0, 20_000, 70_000, 75_000]), [(sample) => sample.a])

    expect(data).toEqual([
      [-55, -5, 0],
      [20, 70, 75],
    ])
  })

  it('builds one column per picked value', () => {
    const data = chartWindow(samples([1000, 2000]), [(sample) => sample.a, (sample) => sample.b])

    expect(data).toEqual([
      [-1, 0],
      [1, 2],
      [-1, -2],
    ])
  })
})
