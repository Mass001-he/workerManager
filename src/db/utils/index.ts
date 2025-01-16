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
const DiffActionKey = '_diffAct';
export interface IDiffResult {
  [key: string]: { [DiffActionKey]: DiffActionType } | undefined | IDiffResult;
}
/**
 *@example
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
          }
        } else if (_to[key] === undefined) {
          res[key] = { [DiffActionKey]: 'remove' };
        } else if (_from[key] !== _to[key]) {
          res[key] = { [DiffActionKey]: 'update' };
        }
      }
    }

    for (const key in _to) {
      if (_to.hasOwnProperty(key) && _from[key] === undefined) {
        res[key] = { [DiffActionKey]: 'add' };
      }
    }
  }

  compareObjects(from, to, result);
  return result;
}
