import { Logger } from '../../utils';
import type { DBServer } from '../dbServer';
import type { Table, TableRow } from './column';

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

  private constructor(
    private table: T,
    private server: DBServer<[T]>,
  ) {
    this.logger = Logger.scope(`Repository[${table.name}]`);
    this.logger.info('created').print();
  }

  insert(item: TableRow<T['columns']>) {}

  insertMany(items: TableRow<T['columns']>[]) {}

  query() {}

  queryMany() {}

  update() {}

  updateMany() {}

  remove() {}

  removeMany() {}
}
