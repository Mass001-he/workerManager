import { offsetUnit } from '../offset'
import { describe, expect, test } from 'vitest'

describe('offsetUnit', () => {
  test('No offset value', () => {
    const result = offsetUnit()
    expect(result).toEqual(['', []])
  })

  test('Offset value is 0', () => {
    const result = offsetUnit(0)
    expect(result).toEqual(['', []])
  })

  test('Valid offset value', () => {
    const result = offsetUnit(10)
    expect(result).toEqual(['OFFSET ?', [10]])
  })

  test('Invalid offset value', () => {
    expect(() => offsetUnit(-1)).toThrow('Invalid offset value')
    expect(() => offsetUnit(1.5)).toThrow('Invalid offset value')
  })
})
