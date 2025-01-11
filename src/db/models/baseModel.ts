import { OpfsSAHPoolDatabase } from '@sqlite.org/sqlite-wasm';
import { Logger } from '../../utils';

export const model = {
  varchar: (length = 255) => {
    return {
      sqlType: `VARCHAR(${length})`,
      jsType: 'string',
    };
  },
  text: () => {
    return {
      sqlType: 'TEXT',
      jsType: 'string',
    };
  },
  integer: () => {
    return {
      sqlType: `INTEGER`,
      jsType: 'number',
    };
  },
  real: () => {
    return {
      sqlType: `REAL`,
      jsType: 'number',
    };
  },
  boolean: () => {
    return {
      sqlType: `BOOLEAN`,
      jsType: 'boolean',
    };
  },
};

export class BaseModel {
  private db: OpfsSAHPoolDatabase;
  private logger: Logger = Logger.scope('BaseModel');

  constructor(db: OpfsSAHPoolDatabase) {
    this.db = db;
  }

  protected async createTable(tableName: string, schema: string) {
    const createTableSQL = `CREATE TABLE IF NOT EXISTS ${tableName} (${schema});`;
    await this.db.exec({ sql: createTableSQL });
    this.logger.info(`Table "${tableName}" created`).print();
  }

  protected async insert(tableName: string, columns: string[], values: any[]) {
    const placeholders = columns.map(() => '?').join(', ');
    const insertSQL = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders});`;
    await this.db.exec({ sql: insertSQL, bind: values });
    this.logger.info(`Data inserted into table "${tableName}"`).print();
  }

  protected async query(tableName: string, columns: string[] = ['*']) {
    const selectSQL = `SELECT ${columns.join(', ')} FROM ${tableName};`;
    const result = await this.db.exec({ sql: selectSQL });
    this.logger.info('query result: ', result).print();
    return result;
  }
}
