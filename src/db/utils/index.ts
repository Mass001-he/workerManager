import { OpfsSAHPoolDatabase } from '@sqlite.org/sqlite-wasm';

export function createTable(db: OpfsSAHPoolDatabase, sql: string) {
  db.exec(sql);
}

export interface ISchemaObj {
  [index: string]: Record<string, string>;
}

export function generateSchema(schemaObj: ISchemaObj): string {
  let schema = Object.entries(schemaObj).reduce((acc, [key, value]) => {
    return acc + `${key} ${value.sqlType},`;
  }, '');

  return schema;
}

export function isOK(result: any[]) {
  return result.length > 0;
}

export type DiffActionType = 'add' | 'remove' | 'update';
export interface IDiffResult {
  [key: string]: { _diffAct: DiffActionType } | undefined | IDiffResult;
}
/**
 * @description diffObj不会处理obj中的数组，因为不同类型的数组对比方式无法确定。例如[1,2,3]和[2,3,4]，是按位对比还是按成员对比效果是截然不同的，所以diffObj只处理对象
 * @param processArray {function} - 可选参数，用于处理数组的对比，如果传入该参数，diffObj会调用该函数处理数组对比
 * @example
 *diffObj({a:1,b:{name:"jac",age:18}}, {a:2,b:{name:"jac"},c:"da"})
 *--->
 *{
 *  a:{_diffAct:"update"},
 *  b:{age:{_diffAct: "remove"}},
 *  c:{_diffAct: "add"}
 *}
 */
export function diffObj<T extends Record<string, any>>(
  from: T,
  to: T,
): IDiffResult {
  const result: IDiffResult = {};

  function compareObjects(_from: T, _to: T, res: IDiffResult) {
    for (const key in _from) {
      if (_from.hasOwnProperty(key)) {
        if (
          typeof _from[key] === 'object' &&
          _from[key] !== null &&
          _to[key] !== undefined
        ) {
          res[key] = {};
          compareObjects(_from[key], _to[key], res[key] as IDiffResult);
          if (Object.keys(res[key] as IDiffResult).length === 0) {
            delete res[key];
          } else {
            if (res[key]) {
              //@ts-ignore
              res[key]._diffAct = 'update';
            }
          }
        } else if (_to[key] === undefined) {
          res[key] = { _diffAct: 'remove' };
        } else if (_from[key] !== _to[key]) {
          res[key] = { _diffAct: 'update' };
        }
      }
    }

    for (const key in _to) {
      if (_to.hasOwnProperty(key) && _from[key] === undefined) {
        res[key] = { _diffAct: 'add' };
      }
    }
  }

  compareObjects(from, to, result);
  return result;
}

export function diffStringArray(
  from: string[],
  to: string[],
): IDiffResult | undefined {
  const result: IDiffResult = {};
  const allKeys = new Set([...from, ...to]);
  for (const key of allKeys) {
    if (!from.includes(key) && to.includes(key)) {
      result[key] = { _diffAct: 'add' };
    } else if (from.includes(key) && !to.includes(key)) {
      result[key] = { _diffAct: 'remove' };
    }
  }
  if (Object.keys(result).length === 0) {
    return undefined;
  }
  return result;
}

export function diffStringArrayRecord<T extends Record<string, string[]>>(
  from: T,
  to: T,
): IDiffResult | undefined {
  const result: IDiffResult = {};
  const allKeys = new Set([...Object.keys(from), ...Object.keys(to)]);
  for (const key of allKeys) {
    const fromVal = from[key];
    const toVal = to[key];

    if (!fromVal && toVal) {
      result[key] = { _diffAct: 'add' };
    } else if (fromVal && !toVal) {
      result[key] = { _diffAct: 'remove' };
    } else if (fromVal && toVal) {
      const diff = diffStringArray(fromVal, toVal);
      if (diff) {
        result[key] = diff;
      }
    }
  }
  if (Object.keys(result).length === 0) {
    return undefined;
  }
  return result;
}
