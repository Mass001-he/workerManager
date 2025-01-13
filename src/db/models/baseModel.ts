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
  private logger: Logger = Logger.scope('BaseModel');

  constructor() {}

  protected async createTable(tableName: string, schema: string) {
    const createTableSQL = `CREATE TABLE IF NOT EXISTS ${tableName} (${schema});`;
  }

  protected async insert(tableName: string, columns: string[], values: any[]) {}

  protected async query(tableName: string, columns: string[] = ['*']) {}
}
