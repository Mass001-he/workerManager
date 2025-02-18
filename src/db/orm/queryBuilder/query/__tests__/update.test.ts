import { UpdateQuery } from '../update'
import { Sqlite3SQLBuilder } from '../../sqlBuilder/sqlite3'
import { describe, expect, test } from 'vitest'

describe('UpdateQuery', () => {
  const createQuery = () =>
    new UpdateQuery<{
      id: number
      name: string
      age: number
      status: string
      created_at: string
    }>({
      sqlBuilder: Sqlite3SQLBuilder,
    })

  test('Basic update', () => {
    const query = createQuery()
      .update('users', { name: 'John', age: 25 })
      .toSQL()

    expect(query[0]).toBe('UPDATE "users" SET "age" = ?, "name" = ?;')
    expect(query[1]).toEqual([25, 'John'])
  })

  test('Update with conditions', () => {
    const query = createQuery()
      .update('users', { status: 'active' })
      .where({ id: 1 })
      .toSQL()

    expect(query[0]).toBe('UPDATE "users" SET "status" = ? WHERE "id" = ?;')
    expect(query[1]).toEqual(['active', 1])
  })

  test('Update with returning values', () => {
    const query = createQuery()
      .update('users', { name: 'John' })
      .returning(['id', 'created_at'])
      .toSQL()

    expect(query[0]).toBe(
      'UPDATE "users" SET "name" = ? RETURNING "id", "created_at";',
    )
    expect(query[1]).toEqual(['John'])
  })

  test('Update with limit', () => {
    const query = createQuery()
      .update('users', { status: 'inactive' })
      .where({ age: { $lt: 18 } })
      .limit(10)
      .toSQL()

    expect(query[0]).toBe(
      'UPDATE "users" SET "status" = ? WHERE "age" < ? LIMIT ?;',
    )
    expect(query[1]).toEqual(['inactive', 18, 10])
  })

  test('Update with complex conditions', () => {
    const query = createQuery()
      .update('users', { status: 'active' })
      .where({
        age: { $gte: 18 },
        status: 'pending',
      })
      .returning('*')
      .toSQL()

    expect(query[0]).toBe(
      'UPDATE "users" SET "status" = ? WHERE "age" >= ? AND "status" = ? RETURNING *;',
    )
    expect(query[1]).toEqual(['active', 18, 'pending'])
  })

  test('Raw SQL update', () => {
    const query = createQuery()
      .updateRaw('UPDATE users SET last_login = CURRENT_TIMESTAMP')
      .where({ id: 1 })
      .toSQL()

    expect(query[0]).toBe(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE "id" = ?;',
    )
    expect(query[1]).toEqual([1])
  })

  test('Error handling - No UPDATE clause', () => {
    const query = createQuery()
    expect(() => query.toSQL()).toThrow('No valid SQL generated')
  })

  test('Error handling - Multiple UPDATE clauses', () => {
    const query = createQuery()
    expect(() =>
      query
        .update('users', { name: 'John' })
        .update('users', { age: 25 })
        .toSQL(),
    ).toThrow('Multiple UPDATE clauses are not supported')
  })

  test('Update with ordering', () => {
    const query = createQuery()
      .update('users', { status: 'active' })
      .orderBy('name', 'ASC')
      .limit(10)
      .toSQL()

    expect(query[0]).toBe(
      'UPDATE "users" SET "status" = ? ORDER BY "name" ASC LIMIT ?;',
    )
    expect(query[1]).toEqual(['active', 10])
  })

  test('Update with raw SQL ordering', () => {
    const query = createQuery()
      .update('users', { status: 'active' })
      .orderByRaw('RANDOM()')
      .limit(5)
      .toSQL()

    expect(query[0]).toBe(
      'UPDATE "users" SET "status" = ? ORDER BY RANDOM() LIMIT ?;',
    )
    expect(query[1]).toEqual(['active', 5])
  })

  test('Update with FROM clause', () => {
    const query = createQuery()
      .update('employees', { salary: 50000 })
      .from('salary_updates')
      .where({
        'employees.id': { $eq: { $col: 'salary_updates.employee_id' } }
      })
      .toSQL()

    expect(query[0]).toBe(
      'UPDATE "employees" SET "salary" = ? FROM "salary_updates" WHERE "employees"."id" = "salary_updates"."employee_id";'
    )
    expect(query[1]).toEqual([50000])
  })

  test('Update with FROM RAW clause', () => {
    const query = createQuery()
      .update('employees', { status: 'inactive' })
      .fromRaw('(SELECT id FROM retired_employees) AS r')
      .where({
        'employees.id': { $eq: { $col: 'r.id' } }
      })
      .toSQL()

    expect(query[0]).toBe(
      'UPDATE "employees" SET "status" = ? FROM (SELECT id FROM retired_employees) AS r WHERE "employees"."id" = "r"."id";'
    )
    expect(query[1]).toEqual(['inactive'])
  })
})
