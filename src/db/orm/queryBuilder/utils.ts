import type { WhereConditionDescription } from './types/query.type'

export function quotes(str: string): string {
  return `"${str}"`
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
  const regex = new RegExp("^" + pattern1.replace(/%/g, ".*").replace(/_/g, ".") + "$");
  return regex.test(pattern2);
}

export function mergeLikePatterns(patterns: string[]): string[] {
  if (patterns.length === 0) {
    return [];
  }

  // Remove duplicates to avoid unnecessary calculations
  const uniquePatterns = Array.from(new Set(patterns));

  // Mark which patterns can be merged
  const toRemove = new Set<number>();

  // Double loop to check if each pattern can be covered by others
  for (let i = 0; i < uniquePatterns.length; i++) {
    for (let j = 0; j < uniquePatterns.length; j++) {
      if (i !== j && canMerge(uniquePatterns[j]!, uniquePatterns[i]!)) {
        // If patterns[j] can cover patterns[i], then patterns[i] can be removed
        toRemove.add(i);
        break;
      }
    }
  }

  // Return patterns that were not marked for removal
  return uniquePatterns.filter((_, index) => !toRemove.has(index));
}

/**
 * Sanitize SQL string to prevent SQL injection attacks.
 * This function escapes special characters and removes dangerous SQL keywords.
 * @param sql The SQL string to sanitize
 * @returns Sanitized SQL string
 */
export function sanitizeSql(sql: string): string {
  if (!sql) return '';
  
  // escape single quote
  let sanitized = sql.replace(/'/g, "''");
  
  // escape double quote
  sanitized = sanitized.replace(/"/g, '""');
  
  // remove multi-line comment
  sanitized = sanitized.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // remove single-line comment
  sanitized = sanitized.replace(/--.*$/gm, '');
  
  // remove the semicolon at the end to prevent multi-statement execution
  sanitized = sanitized.replace(/;+$/, '');
  
  // remove dangerous SQL keywords
  const dangerousKeywords = [
    'DROP',
    'DELETE',
    'UPDATE',
    'INSERT',
    'TRUNCATE',
    'ALTER',
    'EXEC',
    'EXECUTE'
  ];
  
  const regex = new RegExp(`\\b(${dangerousKeywords.join('|')})\\b`, 'gi');
  sanitized = sanitized.replace(regex, '');
  
  return sanitized.trim();
}