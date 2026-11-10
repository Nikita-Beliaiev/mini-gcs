import { describe, expect, it } from 'vitest'
import { classNames } from './classNames'

describe('classNames', () => {
  it('joins class names with spaces', () => {
    expect(classNames('panel', 'map')).toBe('panel map')
  })

  it('skips missing and disabled class names', () => {
    expect(classNames('panel', undefined, false, null, '', 'map')).toBe('panel map')
  })
})
