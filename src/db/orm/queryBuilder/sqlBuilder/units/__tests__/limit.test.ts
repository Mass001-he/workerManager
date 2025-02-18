import { limitUnit } from '../limit'
import { describe, expect, test } from 'vitest'

describe('limitUnit', () => {
  test('No limit value', () => {
    const result = limitUnit()
    expect(result).toEqual(['', []])
  })

  test('Valid limit value', () => {
    const result = limitUnit(10)
    expect(result).toEqual(['LIMIT ?', [10]])
  })

  test('Invalid limit value', () => {
    expect(() => limitUnit(-1)).toThrow('Invalid limit value')
    expect(() => limitUnit(0)).toThrow('Invalid limit value')
    expect(() => limitUnit(1.5)).toThrow('Invalid limit value')
  })
})
