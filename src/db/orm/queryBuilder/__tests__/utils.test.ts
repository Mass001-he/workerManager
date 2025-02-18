import { validateBindings } from '../utils'
import { describe, expect, test } from 'vitest'

describe('validateBindings', () => {
  test('Correct binding count', () => {
    expect(() =>
      validateBindings(['SELECT * FROM users WHERE id = ?', [1]]),
    ).not.toThrow()
    expect(() =>
      validateBindings([
        'SELECT * FROM users WHERE id = ? AND age > ?',
        [1, 18],
      ]),
    ).not.toThrow()
  })

  test('SQL without bindings', () => {
    expect(() => validateBindings(['SELECT * FROM users', []])).not.toThrow()
  })

  test('Insufficient bindings', () => {
    expect(() =>
      validateBindings(['SELECT * FROM users WHERE id = ? AND age > ?', [1]]),
    ).toThrow(/SQL binding count mismatch/)
  })

  test('Too many bindings', () => {
    expect(() =>
      validateBindings(['SELECT * FROM users WHERE id = ?', [1, 2]]),
    ).toThrow(/SQL binding count mismatch/)
  })

  test('LIKE condition using single quotes', () => {
    expect(() =>
      validateBindings([
        "SELECT * FROM users WHERE name LIKE '%?%' AND id = ?",
        [1],
      ]),
    ).toThrow()
  })

  test('Complex SQL statement', () => {
    const sql = `
      SELECT * FROM users 
      WHERE name LIKE ? 
      AND age BETWEEN ? AND ? 
      AND status IN (?, ?, ?)
      AND bio LIKE '%test%'
    `
    expect(() =>
      validateBindings([
        sql,
        ['John%', 18, 30, 'active', 'pending', 'blocked'],
      ]),
    ).not.toThrow()
  })
})
