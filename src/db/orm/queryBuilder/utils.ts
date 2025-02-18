import type {
  Raw,
  SQLWithBindings,
  WhereConditionDescription,
} from './types/query.type'

//分号
export function semicolon(str: string): string {
  return `${str};`
}

export function equalStr(a: string, b: string): string {
  return `${a} = ${b}`
}

export function spaceRight(str: string): string {
  return `${str} `
}

export function spaceLeft(str: string): string {
  return ` ${str}`
}

export function space(str: string): string {
  return ` ${str} `
}

export function quotes(str: string): string {
  return `"${str}"`
}

export function singleQuote(str: string): string {
  return `'${str}'`
}

export function bracket(str: string): string {
  return `(${str})`
}

export function isWhereConditionDescription(
  condition: any,
): condition is WhereConditionDescription {
  if (typeof condition === 'object' && condition !== null) {
    return true
  }
  return false
}
/**
 * Determine if `pattern1` can cover `pattern2`.
 * @param pattern1 first sql LIKE pattern
 * @param pattern2 second sql LIKE pattern
 * @returns if `pattern1` can cover `pattern2`, return `true`, otherwise return `false`
 */
export function canMerge(pattern1: string, pattern2: string): boolean {
  const regex = new RegExp(
    '^' + pattern1.replace(/%/g, '.*').replace(/_/g, '.') + '$',
  )
  return regex.test(pattern2)
}

export function mergeLikePatterns(patterns: string[]): string[] {
  debugger
  if (patterns.length === 0) {
    return []
  }

  // Remove duplicates to avoid unnecessary calculations
  const uniquePatterns = Array.from(new Set(patterns))

  // Mark which patterns can be merged
  const toRemove = new Set<number>()

  // Double loop to check if each pattern can be covered by others
  for (let i = 0; i < uniquePatterns.length; i++) {
    for (let j = 0; j < uniquePatterns.length; j++) {
      if (i !== j && canMerge(uniquePatterns[j]!, uniquePatterns[i]!)) {
        // If patterns[j] can cover patterns[i], then patterns[i] can be removed
        toRemove.add(i)
        break
      }
    }
  }

  // Return patterns that were not marked for removal
  return uniquePatterns.filter((_, index) => !toRemove.has(index))
}

/**
 * Validate if the number of bindings matches the number of placeholders in SQL
 * @throws Error if the number of bindings doesn't match placeholders
 */
export function validateBindings(sqlWithBindings: SQLWithBindings): void {
  const [sql, bindings] = sqlWithBindings
  // Count question marks that are not escaped
  const placeholderCount = (sql.match(/\?/g) || []).length

  if (placeholderCount !== bindings.length) {
    throw new Error(
      `SQL binding count mismatch: ${placeholderCount} placeholders but got ${bindings.length} bindings.\n` +
        `SQL: ${sql}\n` +
        `Bindings: ${JSON.stringify(bindings)}`,
    )
  }
}

export function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && value > 0 && Number.isInteger(value)
}
