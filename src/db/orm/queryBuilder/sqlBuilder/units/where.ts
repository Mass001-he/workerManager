import type {
  Keyof,
  SQLWithBindings,
  WhereClause,
  WhereConditionDescription,
  WhereRaw,
  WhereType,
} from '../../types/query.type'
import {
  isWhereConditionDescription,
  mergeLikePatterns,
  quotes,
  validateBindings,
} from '../../utils'

const operatorMap: Record<keyof BasePartItem, string> = {
  $eq: '=',
  $neq: '!=',
  $gt: '>',
  $gte: '>=',
  $lt: '<',
  $lte: '<=',
  $like: 'LIKE',
  $in: 'IN',
  $nin: 'NOT IN',
  $null: 'IS',
  $between: 'BETWEEN',
  $notBetween: 'NOT BETWEEN',
}

type BasePartItem = {
  $eq?: any[]
  $neq?: any[]
  $gt?: any[]
  $gte?: any[]
  $lt?: any[]
  $lte?: any[]
  $like?: any[]
  $in?: any[]
  $nin?: any[]
  $null?: any[]
  $between?: any[]
  $notBetween?: any[]
}

type SuffixAttrs<T extends Record<string, any>, P extends string> = {
  [K in keyof T as `${K & string}${P}`]: T[K]
}
type AndPartItem = SuffixAttrs<BasePartItem, '_AND'>
type OrPartItem = SuffixAttrs<BasePartItem, '_OR'>
type PartItem = AndPartItem &
  OrPartItem & {
    hasAndCondition: boolean
  }
type PreprocessResult = {
  conditionParts: Map<string, PartItem>
  rawParts: WhereRaw[]
}

const MAX_IN_VALUES = 1000 // 最大 IN 值数量

/**
 * Optimize the structure during the setting process
 */
const optimizeSet = (
  target: PartItem,
  source: WhereConditionDescription,
  type: WhereType,
  column: string,
  key: Keyof<BasePartItem>,
) => {
  if (source[key] === undefined) {
    return
  }
  const targetKey = `${key}_${type}` as Exclude<
    Keyof<PartItem>,
    'hasAndCondition'
  >
  // Initialize the target array if it doesn't exist
  if (target[targetKey] === undefined) {
    target[targetKey] = []
  }
  const targetArray = target[targetKey]!
  const sourceValue = source[key]!

  // Validate BETWEEN conditions
  if (key === '$between') {
    if (!Array.isArray(sourceValue) || sourceValue.length !== 2) {
      throw new Error(
        `BETWEEN condition for column "${column}" must be an array with exactly 2 values`,
      )
    }
    if (sourceValue[0] > sourceValue[1]) {
      throw new Error(
        `BETWEEN condition for column "${column}" has invalid range: ${sourceValue[0]} > ${sourceValue[1]}`,
      )
    }
  }

  if (type === 'OR') {
    // Optimize OR conditions
    switch (key) {
      case '$eq':
        // Check if there's existing IN condition
        if (target['$in_OR']) {
          target['$in_OR'].push(sourceValue)
          return
        }
        // Merge multiple OR equals into IN condition
        if (target['$eq_OR'] && target['$eq_OR'].length > 0) {
          // Move existing $eq_OR values to $in_OR
          if (!target['$in_OR']) {
            target['$in_OR'] = []
          }
          target['$in_OR'].push(...target['$eq_OR'], sourceValue)
          target['$eq_OR'] = []
          return
        }
        break

      case '$gt':
      case '$gte':
        const existingGt = target['$gt_OR']?.[0]
        const existingGte = target['$gte_OR']?.[0]

        //      x > 3 OR x > 5 => x > 3
        //      x >= 3 OR x >= 5 => x >= 3
        //      x > 3 OR x >= 4 => x > 3
        if (key === '$gt') {
          if (existingGt !== undefined) {
            target['$gt_OR'] = [Math.min(sourceValue, existingGt)]
            return
          }
          if (existingGte !== undefined && sourceValue <= existingGte) {
            target['$gt_OR'] = [sourceValue]
            delete target['$gte_OR']
            return
          }
        }

        if (key === '$gte') {
          if (existingGte !== undefined) {
            target['$gte_OR'] = [Math.min(sourceValue, existingGte)]
            return
          }
          if (existingGt !== undefined && sourceValue < existingGt) {
            target['$gte_OR'] = [sourceValue]
            delete target['$gt_OR']
            return
          }
        }
        break

      case '$lt':
      case '$lte':
        const existingLt = target['$lt_OR']?.[0]
        const existingLte = target['$lte_OR']?.[0]

        //      x < 10 OR x < 8 => x < 10
        //      x <= 10 OR x <= 8 => x <= 10
        //      x < 10 OR x <= 9 => x < 10
        if (key === '$lt') {
          if (existingLt !== undefined) {
            target['$lt_OR'] = [Math.max(sourceValue, existingLt)]
            return
          }
          if (existingLte !== undefined && sourceValue >= existingLte) {
            target['$lt_OR'] = [sourceValue]
            delete target['$lte_OR']
            return
          }
        }

        if (key === '$lte') {
          if (existingLte !== undefined) {
            target['$lte_OR'] = [Math.max(sourceValue, existingLte)]
            return
          }
          if (existingLt !== undefined && sourceValue > existingLt) {
            target['$lte_OR'] = [sourceValue]
            delete target['$lt_OR']
            return
          }
        }
        break

      case '$in':
        // Merge IN conditions and remove duplicates
        if (!Array.isArray(sourceValue)) {
          throw new Error(
            `IN condition for column "${column}" must be an array`,
          )
        }
        if (target['$in_OR']) {
          target['$in_OR'] = [...new Set([...target['$in_OR'], ...sourceValue])]
          return
        }
        break

      case '$between':
        if (target['$between_OR']) {
          // merge between conditions
          const existing = target['$between_OR'][0]
          target['$between_OR'] = [
            [
              Math.min(sourceValue[0], existing[0]),
              Math.max(sourceValue[1], existing[1]),
            ],
          ]
          return
        }
        break

      case '$null':
        // if there is already IS NULL condition, don't add it again
        if (target['$null_AND'] || target['$null_OR']) {
          return
        }
        break

      case '$like':
        if (target['$like_OR']!.length > 0) {
          target['$like_OR'] = mergeLikePatterns(target['$like_OR']!)
          return
        }
        break
    }
  }

  // Handle AND conditions
  if (type === 'AND') {
    const highPriority = ['eq', 'neq', 'like', 'in', 'between', 'notBetween']
    if (highPriority.includes(key) && target.hasAndCondition) {
      console.error(target, key)
      throw new Error(
        `"${column}" has already had another condition with equality in AND condition`,
      )
    }

    target.hasAndCondition = true
  }

  if (Array.isArray(sourceValue)) {
    if (key === '$between' || key === '$notBetween') {
      targetArray.push(sourceValue)
    } else {
      targetArray.push(...sourceValue)
    }
  } else {
    targetArray.push(sourceValue)
  }
}

/**
 * @description Preprocess the where condition, convert it to {@link BasePartItem} format, and the original {@link WhereRaw} format, which is convenient for subsequent optimization and conversion to SQL
 */
const preprocess = (whereClauses: WhereClause[]): PreprocessResult => {
  const parts = new Map<string, PartItem>()
  const rawParts: WhereRaw[] = []

  whereClauses.forEach((whereClause) => {
    const { rule, raw } = whereClause
    if (raw) {
      rawParts.push(raw)
      return
    }

    const { conditions: condition, type } = rule!
    const columns = Object.keys(condition)
    //skip in empty condition
    if (columns.length === 0) {
      return
    }

    columns.forEach((column) => {
      const partHasColumn = parts.has(column)
      if (partHasColumn === false) {
        parts.set(column, {
          hasAndCondition: false,
        })
      }
      const partItem: PartItem = parts.get(column)!
      const sourceCondition = condition[column]

      if (isWhereConditionDescription(sourceCondition)) {
        // don't change to Loop, It's more efficient.
        optimizeSet(partItem, sourceCondition, type, column, '$eq')
        optimizeSet(partItem, sourceCondition, type, column, '$neq')
        optimizeSet(partItem, sourceCondition, type, column, '$gt')
        optimizeSet(partItem, sourceCondition, type, column, '$gte')
        optimizeSet(partItem, sourceCondition, type, column, '$lt')
        optimizeSet(partItem, sourceCondition, type, column, '$lte')
        optimizeSet(partItem, sourceCondition, type, column, '$like')
        optimizeSet(partItem, sourceCondition, type, column, '$in')
        optimizeSet(partItem, sourceCondition, type, column, '$nin')
        optimizeSet(partItem, sourceCondition, type, column, '$null')
        optimizeSet(partItem, sourceCondition, type, column, '$between')
        optimizeSet(partItem, sourceCondition, type, column, '$notBetween')
      } else {
        //if the condition is not an object, it is considered to be an equal condition
        optimizeSet(partItem, { $eq: sourceCondition }, type, column, '$eq')
      }
    })
  })

  return {
    conditionParts: parts,
    rawParts,
  }
}

const convertToSQL = (optimizeResult: PreprocessResult): SQLWithBindings => {
  const { conditionParts, rawParts } = optimizeResult
  const conditions: Array<{ sql: string; bindings: any[] }> = []
  const orConditions: Array<{ sql: string; bindings: any[] }> = []

  // 验证条件数量
  if (conditionParts.size > MAX_IN_VALUES) {
    throw new Error(
      `Too many conditions (${conditionParts.size}). Maximum allowed is ${MAX_IN_VALUES}`,
    )
  }

  // Process condition parts
  conditionParts.forEach((partItem, column) => {
    const _column = quotes(column)
    const columnConditions: Array<{ sql: string; bindings: any[] }> = []
    const andConditions: Array<{ sql: string; bindings: any[] }> = []
    const orColumnConditions: Array<{ sql: string; bindings: any[] }> = []

    // Process each operator type
    ;(Object.keys(operatorMap) as (keyof BasePartItem)[]).forEach(
      (operator) => {
        const andKey = `${operator}_AND` as keyof PartItem
        const orKey = `${operator}_OR` as keyof PartItem
        const andValues = partItem[andKey] as any[] | undefined
        const orValues = partItem[orKey] as any[] | undefined

        if (andValues?.length) {
          switch (operator) {
            case '$between':
            case '$notBetween':
              // 修改这里的数组访问方式
              andValues.forEach((range) => {
                andConditions.push({
                  sql: `${_column} ${operatorMap[operator]} ? AND ?`,
                  bindings: [range[0], range[1]], // 直接使用数组的两个元素
                })
              })
              break
            case '$in':
            case '$nin':
              andConditions.push({
                sql: `${_column} ${operatorMap[operator]} (${andValues.map(() => '?').join(', ')})`,
                bindings: andValues,
              })
              break
            case '$null':
              andConditions.push({
                sql: `${_column} ${operatorMap[operator]} ${andValues[0] ? 'NULL' : 'NOT NULL'}`,
                bindings: [],
              })
              break
            case '$like':
              andValues.forEach((value) => {
                andConditions.push({
                  sql: `${_column} ${operatorMap[operator]} ?`,
                  bindings: [value],
                })
              })
              break
            default:
              andValues.forEach((value) => {
                andConditions.push({
                  sql: `${_column} ${operatorMap[operator]} ?`,
                  bindings: [value],
                })
              })
          }
        }

        if (orValues?.length) {
          switch (operator) {
            case '$between':
            case '$notBetween':
              orValues.forEach((range) => {
                orColumnConditions.push({
                  sql: `${_column} ${operatorMap[operator]} ? AND ?`,
                  bindings: [range[0], range[1]],
                })
              })
              break
            case '$in':
            case '$nin':
              orColumnConditions.push({
                sql: `${_column} ${operatorMap[operator]} (${orValues.map(() => '?').join(', ')})`,
                bindings: orValues,
              })
              break
            case '$null':
              orValues.forEach((value) => {
                orColumnConditions.push({
                  sql: `${_column} ${operatorMap[operator]} ${value ? 'NULL' : 'NOT NULL'}`,
                  bindings: [],
                })
              })
              break
            case '$like':
              orValues.forEach((value) => {
                orColumnConditions.push({
                  sql: `${_column} ${operatorMap[operator]} ?`,
                  bindings: [value],
                })
              })
              break
            default:
              orValues.forEach((value) => {
                orColumnConditions.push({
                  sql: `${_column} ${operatorMap[operator]} ?`,
                  bindings: [value],
                })
              })
          }
        }
      },
    )

    // Combine AND conditions
    if (andConditions.length > 0) {
      const combinedSql = andConditions.map((c) => c.sql).join(' AND ')
      const combinedBindings = andConditions.flatMap((c) => c.bindings)
      columnConditions.push({ sql: combinedSql, bindings: combinedBindings })
    }

    // Combine OR conditions for this column
    if (orColumnConditions.length > 0) {
      const combinedSql = orColumnConditions.map((c) => c.sql).join(' OR ')
      const combinedBindings = orColumnConditions.flatMap((c) => c.bindings)
      orConditions.push({ sql: combinedSql, bindings: combinedBindings })
    }

    // Add column conditions to main conditions array
    if (columnConditions.length > 0) {
      const combinedSql = columnConditions.map((c) => c.sql).join(' AND ')
      const combinedBindings = columnConditions.flatMap((c) => c.bindings)
      conditions.push({ sql: combinedSql, bindings: combinedBindings })
    }
  })

  // Process raw SQL parts
  rawParts.forEach((raw) => {
    const condition = { sql: raw.sql, bindings: raw.bindings || [] }
    if (raw.type === 'OR') {
      orConditions.push(condition)
    } else {
      conditions.push(condition)
    }
  })

  // Combine all conditions
  const andConditionsStr =
    conditions.length > 0 ? conditions.map((c) => c.sql).join(' AND ') : ''
  const orConditionsStr =
    orConditions.length > 0 ? orConditions.map((c) => c.sql).join(' OR ') : ''
  const allBindings = [
    ...conditions.flatMap((c) => c.bindings),
    ...orConditions.flatMap((c) => c.bindings),
  ]

  if (!andConditionsStr && !orConditionsStr) {
    return ['', []]
  }

  if (!andConditionsStr) {
    return [`WHERE ${orConditionsStr}`, allBindings]
  }

  if (!orConditionsStr) {
    return [`WHERE ${andConditionsStr}`, allBindings]
  }

  return [`WHERE ${andConditionsStr} OR ${orConditionsStr}`, allBindings]
}

export const whereUnit = (whereClauses?: WhereClause[]): SQLWithBindings => {
  if (whereClauses === undefined) {
    return ['', []]
  }
  const hasQuery = whereClauses.length > 0
  if (hasQuery === false) {
    return ['', []]
  }
  const preprocessResult = preprocess(whereClauses)

  const sqlWithBindings = convertToSQL(preprocessResult)
  validateBindings(sqlWithBindings)
  return sqlWithBindings
}
