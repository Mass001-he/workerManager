import { Logger } from '../../utils';
interface ColumnType<T> {
  sqlType: string;
  jsType: T;
}

export const model = {
  varchar: (length = 255): ColumnType<string> => {
    return {
      sqlType: `VARCHAR(${length})`,
      jsType: 'string',
    };
  },
  text: (): ColumnType<string> => {
    return {
      sqlType: 'TEXT',
      jsType: 'string',
    };
  },
  integer: (): ColumnType<number> => {
    return {
      sqlType: `INTEGER`,
      jsType: 0,
    };
  }
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
