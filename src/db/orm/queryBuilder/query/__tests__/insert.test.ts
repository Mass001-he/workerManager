import { describe, expect, it } from 'vitest'
import { InsertQuery } from '../insert'
import { Sqlite3SQLBuilder } from '../../sqlBuilder/sqlite3'

interface User {
  id: number
  name: string
  age: number
  email?: string
}

describe('InsertQuery', () => {
  const createQuery = () =>
    new InsertQuery<User>({
      sqlBuilder: Sqlite3SQLBuilder,
    })

  it('should generate basic insert query', () => {
    const query = createQuery()
      .insert('users')
      .values({ name: 'John', age: 25 })

    const [sql, bindings] = query.toSQL()
    expect(sql).toBe('INSERT INTO "users" ("age", "name") VALUES (?, ?);')
    expect(bindings).toEqual([25, 'John'])
  })

  it('should handle multiple values insert', () => {
    const query = createQuery()
      .insert('users')
      .values([
        { name: 'John', age: 25 },
        { name: 'Jane', age: 23 },
      ])

    const [sql, bindings] = query.toSQL()
    expect(sql).toBe(
      'INSERT INTO "users" ("age", "name") VALUES (?, ?), (?, ?);',
    )
    expect(bindings).toEqual([25, 'John', 23, 'Jane'])
  })

  it('should handle ON CONFLICT DO NOTHING', () => {
    const query = createQuery()
      .insert('users')
      .values({ name: 'John', age: 25 })
      .onConflict('id')
      .doNothing()

    const [sql, bindings] = query.toSQL()
    expect(sql).toBe(
      'INSERT INTO "users" ("age", "name") VALUES (?, ?) ON CONFLICT (id) DO NOTHING;',
    )
    expect(bindings).toEqual([25, 'John'])
  })

  it('should handle ON CONFLICT DO UPDATE', () => {
    const query = createQuery()
      .insert('users')
      .values({ name: 'John', age: 25 })
      .onConflict('id')
      .doUpdate({
        excluded: { age: 'excluded.age' },
        merge: { name: 'Updated' },
      })

    const [sql, bindings] = query.toSQL()
    expect(sql).toBe(
      'INSERT INTO "users" ("age", "name") VALUES (?, ?) ON CONFLICT (id) DO UPDATE SET age = excluded.age, name = ?;',
    )
    expect(bindings).toEqual([25, 'John', 'Updated'])
  })

  it('should handle RETURNING clause', () => {
    const query = createQuery()
      .insert('users')
      .values({ name: 'John', age: 25 })
      .returning(['id', 'name'])

    const [sql, bindings] = query.toSQL()
    expect(sql).toBe(
      'INSERT INTO "users" ("age", "name") VALUES (?, ?) RETURNING "id", "name";',
    )
    expect(bindings).toEqual([25, 'John'])
  })

  it('should throw error when table name is empty', () => {
    const query = createQuery()
    expect(() => query.insert('')).toThrow('Table name is required')
  })

  it('should throw error when no values provided', () => {
    const query = createQuery().insert('users')
    expect(() => query.toSQL()).toThrow('No values to insert')
  })

  it('should throw error when setting multiple conflict clauses', () => {
    const query = createQuery()
      .insert('users')
      .values({ name: 'John', age: 25 })
      .onConflict('id')
      .doNothing()

    expect(() => query.doUpdate({ merge: { age: 30 } })).toThrow(
      'On conflict clause already set',
    )
  })

  it('should handle raw returning clause', () => {
    const query = createQuery()
      .insert('users')
      .values({ name: 'John', age: 25 })
      .returningRaw('count(*) as total')

    const [sql, bindings] = query.toSQL()
    expect(sql).toBe(
      'INSERT INTO "users" ("age", "name") VALUES (?, ?) RETURNING count(*) as total;',
    )
    expect(bindings).toEqual([25, 'John'])
  })

  it('should handle multiple conflict columns', () => {
    const query = createQuery()
      .insert('users')
      .values({ name: 'John', age: 25 })
      .onConflict('id')
      .onConflict('email')
      .doNothing()

    const [sql, bindings] = query.toSQL()
    expect(sql).toBe(
      'INSERT INTO "users" ("age", "name") VALUES (?, ?) ON CONFLICT (id, email) DO NOTHING;',
    )
    expect(bindings).toEqual([25, 'John'])
  })

  it('should handle ROLLBACK conflict resolution', () => {
    const query = createQuery()
      .insert('users')
      .values({ name: 'John', age: 25 })
      .onConflict()
      .rollback()

    const [sql, bindings] = query.toSQL()
    expect(sql).toBe(
      'INSERT INTO "users" ("age", "name") VALUES (?, ?) ON CONFLICT ROLLBACK;',
    )
    expect(bindings).toEqual([25, 'John'])
  })

  it('should handle ABORT conflict resolution', () => {
    const query = createQuery()
      .insert('users')
      .values({ name: 'John', age: 25 })
      .onConflict()
      .abort()

    const [sql, bindings] = query.toSQL()
    expect(sql).toBe(
      'INSERT INTO "users" ("age", "name") VALUES (?, ?) ON CONFLICT ABORT;',
    )
    expect(bindings).toEqual([25, 'John'])
  })

  it('should handle FAIL conflict resolution', () => {
    const query = createQuery()
      .insert('users')
      .values({ name: 'John', age: 25 })
      .onConflict()
      .fail()

    const [sql, bindings] = query.toSQL()
    expect(sql).toBe(
      'INSERT INTO "users" ("age", "name") VALUES (?, ?) ON CONFLICT FAIL;',
    )
    expect(bindings).toEqual([25, 'John'])
  })

  it('should handle IGNORE conflict resolution', () => {
    const query = createQuery()
      .insert('users')
      .values({ name: 'John', age: 25 })
      .onConflict()
      .ignore()

    const [sql, bindings] = query.toSQL()
    expect(sql).toBe(
      'INSERT INTO "users" ("age", "name") VALUES (?, ?) ON CONFLICT IGNORE;',
    )
    expect(bindings).toEqual([25, 'John'])
  })

  it('should handle REPLACE conflict resolution', () => {
    const query = createQuery()
      .insert('users')
      .values({ name: 'John', age: 25 })
      .onConflict()
      .replace()

    const [sql, bindings] = query.toSQL()
    expect(sql).toBe(
      'INSERT INTO "users" ("age", "name") VALUES (?, ?) ON CONFLICT REPLACE;',
    )
    expect(bindings).toEqual([25, 'John'])
  })
})
