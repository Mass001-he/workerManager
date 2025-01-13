import { Logger } from '../utils';
import type { DBServer } from './dbServer';

export class ORM {
  private logger = Logger.scope('ORM');
  constructor(private server: DBServer) {
    this.migration();
  }

  async migration() {
    const { models, exec } = this.server;
    this.logger.info('Migration start').print();
    this.logger.info('Loading models:', models).print();
    models.forEach((model) => {
      // model todo
      model.createTable();
    });
  }
}
