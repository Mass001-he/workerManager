import type {
  Bindings,
  InsertClause,
  SQLWithBindings,
} from '../../types/query.type'
import { arraysEqual, quotes, validateBindings } from '../../utils'

const MAX_BATCH_SIZE = 10000

export const insertUnit = (
  insertClauses?: InsertClause[],
): SQLWithBindings[] => {
  if (!insertClauses || insertClauses.length === 0) {
    throw new Error('No INSERT clause provided')
  }

  if (insertClauses.length > 1) {
    throw new Error('Multiple INSERT clauses are not supported')
  }

  const clause = insertClauses[0]!
  const results: SQLWithBindings[] = []

  if (clause.raw) {
    let sql = clause.raw.sql
    const bindings: Bindings = []
    if (clause.raw.bindings) {
      bindings.push(...clause.raw.bindings)
    }
    const result: SQLWithBindings = [sql, bindings]
    if (bindings.length > 0) {
      validateBindings(result)
    }
    results.push(result)
  } else if (clause.rule) {
    const { table, values } = clause.rule
    const valuesArray = Array.isArray(values) ? values : [values]

    if (valuesArray.length === 0) {
      throw new Error('No values provided for INSERT')
    }

    if (valuesArray.length > MAX_BATCH_SIZE) {
      throw new Error(`Batch size exceeds maximum limit of ${MAX_BATCH_SIZE}`)
    }

    // 按列组合和顺序对数据进行分组
    const groups: { columns: string[]; values: typeof valuesArray }[] = []
    let currentGroup: { columns: string[]; values: typeof valuesArray } | null =
      null

    valuesArray.forEach((obj) => {
      const columns = Object.keys(obj).sort()

      // 如果当前组不存在，或者列不匹配，创建新组
      if (!currentGroup || !arraysEqual(currentGroup.columns, columns)) {
        currentGroup = { columns, values: [] }
        groups.push(currentGroup)
      }

      currentGroup.values.push(obj)
    })

    groups.forEach((group) => {
      const { columns, values } = group
      const bindings: Bindings = []

      // 创建表语句
      const tableStatement = `INSERT INTO ${quotes(table)} (${columns.map(quotes).join(', ')})`

      // 创建占位符和收集绑定值
      const placeholders = values
        .map(
          (obj) =>
            `(${columns
              .map((col) => {
                const value = obj[col]
                if (value !== null || value !== undefined) {
                  if (typeof value === 'string') {
                    bindings.push(value)
                    return '?'
                  }
                  return value
                }
                return 'NULL'
              })
              .join(', ')})`,
        )
        .join(', ')

      const sql = `${tableStatement} VALUES ${placeholders}`
      const result: SQLWithBindings = [sql, bindings]

      if (bindings.length > 0) {
        validateBindings(result)
      }

      results.push(result)
    })
  }

  return results
}
