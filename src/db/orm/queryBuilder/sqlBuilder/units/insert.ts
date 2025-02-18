import type {
  Bindings,
  InsertClause,
  SQLWithBindings,
} from '../../types/query.type'
import { quotes, validateBindings } from '../../utils'

const MAX_BATCH_SIZE = 10000

export const insertUnit = (insertClauses?: InsertClause[]): SQLWithBindings => {
  if (!insertClauses || insertClauses.length === 0) {
    throw new Error('No INSERT clause provided')
  }

  if (insertClauses.length > 1) {
    throw new Error('Multiple INSERT clauses are not supported')
  }

  const clause = insertClauses[0]!
  let sql = ''
  const bindings: Bindings = []

  if (clause.raw) {
    sql = clause.raw.sql
    if (clause.raw.bindings) {
      bindings.push(...clause.raw.bindings)
    }
  } else if (clause.rule) {
    const { table, values } = clause.rule
    const valuesArray = Array.isArray(values) ? values : [values]

    if (valuesArray.length === 0) {
      throw new Error('No values provided for INSERT')
    }

    if (valuesArray.length > MAX_BATCH_SIZE) {
      throw new Error(`Batch size exceeds maximum limit of ${MAX_BATCH_SIZE}`)
    }

    // get unique column names and sort them to ensure consistent order
    const columns = Array.from(new Set(valuesArray.flatMap(Object.keys))).sort()

    if (columns.length === 0) {
      throw new Error('No columns provided for INSERT')
    }
    // add quotes to column names and create table statement once
    const tableStatement = `INSERT INTO ${quotes(table)} (${columns.map(quotes).join(', ')})`

    // create placeholders and collect bindings in one pass
    const placeholders = valuesArray
      .map(
        (obj) =>
          `(${columns
            .map((col) => {
              if (col in obj) {
                const value = obj[col]
                if (value !== null) {
                  bindings.push(value)
                  return '?'
                }
              }
              return 'NULL'
            })
            .join(', ')})`,
      )
      .join(', ')

    sql = `${tableStatement} VALUES ${placeholders}`
  }

  const result: SQLWithBindings = [sql, bindings]

  if (bindings.length > 0) {
    validateBindings(result)
  }

  return result
}
