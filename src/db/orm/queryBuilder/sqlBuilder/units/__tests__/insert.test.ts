import { insertUnit } from '../insert'
import type { InsertClause } from '../../../types/query.type'
import { describe, expect, test } from 'vitest'

describe('insertUnit', () => {
  test('Empty INSERT clause', () => {
    expect(() => insertUnit()).toThrow('No INSERT clause provided')
  })

  test('Single row insert', () => {
    const clauses: InsertClause[] = [
      {
        rule: {
          table: 'users',
          values: { name: 'John', age: 25 },
        },
      },
    ]
    const result = insertUnit(clauses)
    expect(result[0]).toBe('INSERT INTO "users" ("age", "name") VALUES (?, ?)')
    expect(result[1]).toEqual([25, 'John'])
  })

  test('Multiple rows insert', () => {
    const clauses: InsertClause[] = [
      {
        rule: {
          table: 'users',
          values: [
            { name: 'John', age: 25 },
            { name: 'Jane', age: 23 },
          ],
        },
      },
    ]
    const result = insertUnit(clauses)
    expect(result[0]).toBe(
      'INSERT INTO "users" ("age", "name") VALUES (?, ?), (?, ?)',
    )
    expect(result[1]).toEqual([25, 'John', 23, 'Jane'])
  })

  test('Raw SQL insert', () => {
    const clauses: InsertClause[] = [
      {
        raw: {
          sql: 'INSERT INTO users (name, age) VALUES (?, ?)',
          bindings: ['John', 25],
        },
      },
    ]
    const result = insertUnit(clauses)
    expect(result[0]).toBe('INSERT INTO users (name, age) VALUES (?, ?)')
    expect(result[1]).toEqual(['John', 25])
  })

  test('Multiple rows insert - Different column counts', () => {
    const clauses: InsertClause[] = [
      {
        rule: {
          table: 'users',
          values: [
            { name: 'John', age: 25, role: 'admin' },
            { name: 'Jane', age: 23 },
          ],
        },
      },
    ]
    const result = insertUnit(clauses)
    expect(result[0]).toBe(
      'INSERT INTO "users" ("age", "name", "role") VALUES (?, ?, ?), (?, ?, NULL)',
    )
    expect(result[1]).toEqual([25, 'John', 'admin', 23, 'Jane'])
  })

  test('Error handling - Multiple INSERT clauses', () => {
    const clauses: InsertClause[] = [
      {
        rule: {
          table: 'users',
          values: { name: 'John' },
        },
      },
      {
        rule: {
          table: 'users',
          values: { name: 'Jane' },
        },
      },
    ]
    expect(() => insertUnit(clauses)).toThrow(
      'Multiple INSERT clauses are not supported',
    )
  })

  test('Error handling - Empty values object', () => {
    const clauses: InsertClause[] = [
      {
        rule: {
          table: 'users',
          values: {},
        },
      },
    ]
    expect(() => insertUnit(clauses)).toThrow('No columns provided for INSERT')
  })

  test('Error handling - Empty values array', () => {
    const clauses: InsertClause[] = [
      {
        rule: {
          table: 'users',
          values: [],
        },
      },
    ]
    expect(() => insertUnit(clauses)).toThrow('No values provided for INSERT')
  })

  test('Error handling - Binding count mismatch', () => {
    const clauses: InsertClause[] = [
      {
        raw: {
          sql: 'INSERT INTO users (name, age) VALUES (?, ?)',
          bindings: ['John'], // Only one binding provided but SQL has two placeholders
        },
      },
    ]
    expect(() => insertUnit(clauses)).toThrow(/SQL binding count mismatch/)
  })
})
