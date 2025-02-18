import { SelectQuery } from '../select'
import { Sqlite3SQLBuilder } from '../../sqlBuilder/sqlite3'
import { describe, expect, test } from 'vitest'

describe('SelectQuery', () => {
  const createQuery = () =>
    new SelectQuery<{
      id: number
      name: string
      age: number
      status: string
      created_at: string
      department: string
      salary: number
    }>({
      sqlBuilder: Sqlite3SQLBuilder,
    })

  test('Basic query', () => {
    const query = createQuery().select(['id', 'name']).from('users').toSQL()

    expect(query[0]).toBe('SELECT "id", "name" FROM "users";')
    expect(query[1]).toEqual([])
  })

  test('Query all columns', () => {
    const query = createQuery().select('*').from('users').toSQL()

    expect(query[0]).toBe('SELECT * FROM "users";')
    expect(query[1]).toEqual([])
  })

  test('Query with conditions', () => {
    const query = createQuery()
      .select(['name', 'age'])
      .from('users')
      .where({ age: { $gt: 18 } })
      .toSQL()

    expect(query[0]).toBe('SELECT "name", "age" FROM "users" WHERE "age" > ?;')
    expect(query[1]).toEqual([18])
  })

  test('Query with complex conditions', () => {
    const query = createQuery()
      .select(['name', 'department'])
      .from('users')
      .where({
        age: { $gte: 20 },
        department: 'IT',
        salary: { $gt: 50000 },
      })
      .toSQL()

    expect(query[0]).toBe(
      'SELECT "name", "department" FROM "users" WHERE "age" >= ? AND "department" = ? AND "salary" > ?;',
    )
    expect(query[1]).toEqual([20, 'IT', 50000])
  })

  test('Query with ordering', () => {
    const query = createQuery()
      .select(['name', 'age'])
      .from('users')
      .orderBy('age', 'DESC')
      .toSQL()

    expect(query[0]).toBe(
      'SELECT "name", "age" FROM "users" ORDER BY "age" DESC;',
    )
    expect(query[1]).toEqual([])
  })

  test('Query with grouping', () => {
    const query = createQuery()
      .select(['department'])
      .from('users')
      .groupBy('department')
      .toSQL()

    expect(query[0]).toBe(
      'SELECT "department" FROM "users" GROUP BY "department";',
    )
    expect(query[1]).toEqual([])
  })

  test('Query with limit and offset', () => {
    const query = createQuery()
      .select(['name'])
      .from('users')
      .orderBy('id')
      .limit(10)
      .offset(20)
      .toSQL()

    expect(query[0]).toBe(
      'SELECT "name" FROM "users" ORDER BY "id" LIMIT ? OFFSET ?;',
    )
    expect(query[1]).toEqual([10, 20])
  })

  test('Query with OR conditions', () => {
    const query = createQuery()
      .select(['name'])
      .from('users')
      .where({ age: { $lt: 20 } })
      .orWhere({ department: 'HR' })
      .toSQL()

    expect(query[0]).toBe(
      'SELECT "name" FROM "users" WHERE "age" < ? OR "department" = ?;',
    )
    expect(query[1]).toEqual([20, 'HR'])
  })

  test('Raw SQL query', () => {
    const query = createQuery()
      .select(['name'])
      .fromRaw('(SELECT * FROM users WHERE active = ?) AS u', ['true'])
      .whereRaw('age > ? AND department = ?', [25, 'IT'])
      .orderByRaw('RANDOM()')
      .toSQL()

    expect(query[0]).toBe(
      'SELECT "name" FROM (SELECT * FROM users WHERE active = ?) AS u WHERE age > ? AND department = ? ORDER BY RANDOM();',
    )
    expect(query[1]).toEqual(['true', 25, 'IT'])
  })

  test('Default query all columns', () => {
    const query = createQuery().from('users').toSQL()

    expect(query[0]).toBe('SELECT * FROM "users";')
    expect(query[1]).toEqual([])
  })

  test('Error handling - No FROM clause', () => {
    const query = createQuery()
    expect(() => query.toSQL()).toThrow('FROM clause is required')
  })

  test('Complex combined query', () => {
    const query = createQuery()
      .select(['name', 'department', 'salary'])
      .from('users')
      .where({ status: 'active' })
      .groupBy('department')
      .orderBy('salary', 'DESC')
      .limit(5)
      .offset(10)
      .toSQL()

    expect(query[0]).toBe(
      'SELECT "name", "department", "salary" FROM "users" WHERE "status" = ? GROUP BY "department" ORDER BY "salary" DESC LIMIT ? OFFSET ?;',
    )
    expect(query[1]).toEqual(['active', 5, 10])
  })

  test('Multiple order conditions', () => {
    const query = createQuery()
      .select(['name'])
      .from('users')
      .orderBy('department')
      .orderBy('name', 'DESC')
      .toSQL()

    expect(query[0]).toBe(
      'SELECT "name" FROM "users" ORDER BY "department", "name" DESC;',
    )
    expect(query[1]).toEqual([])
  })
})
