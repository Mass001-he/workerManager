import { Logger } from '../../utils';
import type { DBServer } from '../dbServer';
import type { Table } from './column';

export class ORM<T extends Table[]> {
  private logger = Logger.scope('ORM');
  constructor(private server: DBServer<T>) {}

  migration() {
    this.logger.info('Migration start').print();
    this.logger.info('Loading models:', this.server.tables).print();
    const sql = this.server.tables
      .map((table) => {
        return table.genCreateSql();
      })
      .join('\n');
    this.logger.info('SQL:\n', sql).print();
    return this.server.exec(sql);
  }
}
