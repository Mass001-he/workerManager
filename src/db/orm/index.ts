import { Logger } from '../../utils';
import type { Table } from './column';

export class ORM<T extends Table[]> {
  private logger = Logger.scope('ORM');
  constructor(private tables: T) {
    this.migration();
  }

  async migration() {
    this.logger.info('Migration start').print();
    this.logger.info('Loading models:', this.tables).print();
  }
}
