import { Logger } from '../../utils';
import type { DBServer } from '../dbServer';
import type { BaseColumnDescriptor, Table, TableRow } from './column';

export class Repository<T extends Table> {
  static insMap = new Map<string, Repository<Table>>();
  static create<T extends Table>(table: T, server: DBServer<[T]>) {
    const key = table.name;
    if (Repository.insMap.has(key)) {
      return Repository.insMap.get(key) as Repository<T>;
    }
    const ins = new Repository(table, server);
    Repository.insMap.set(key, ins);
    return ins;
  }
  private logger: Logger;

  get name() {
    return this.table.name;
  }

  get columns() {
    return this.table.columns as Record<string, BaseColumnDescriptor>;
  }

  private constructor(
    private table: T,
    private server: DBServer<[T]>,
  ) {
    this.logger = Logger.scope(`Repo_${table.name}`);
    this.logger.info('created').print();
  }

  private validateColumns(
    columns: TableRow<T['columns']> | TableRow<T['columns']>[],
  ) {
    const _columns = Array.isArray(columns) ? [...columns] : [columns];

    _columns.forEach((column) => {
      Object.entries(column).forEach(([key, value]) => {
        const res = this.table.columns[key].verify(value);

        if (Array.isArray(res)) {
          // 报错
          throw new Error(
            `Validation failed for column ${key}: ${res.join(', ')}, current value is ${value}`,
          );
        }
      });
    });
  }

  insert(item: TableRow<T['columns']>) {
    this.insertMany([item]);
  }

  insertMany(items: TableRow<T['columns']>[]) {
    this.validateColumns(items);

    const columns = Object.keys(items[0]).join(', ');

    // 构建插入 SQL 语句
    const valuesList = items
      .map((item) => {
        const values = Object.values(item).map((value) => {
          if (typeof value === 'string') {
            return `'${value.replace(/'/g, "''")}'`; // 处理字符串中的单引号
          }
          return value;
        });
        return `(${values.join(', ')})`;
      })
      .join(', ');

    const sql = `INSERT INTO ${this.table.name} (${columns}) VALUES ${valuesList};`;
    // 执行插入操作
    this.server.exec(sql);
  }

  query() {}

  queryMany() {}

  update() {}

  updateMany() {}

  remove() {}

  removeMany() {}
}
