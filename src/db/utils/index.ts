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
