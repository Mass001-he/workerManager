import { OpfsSAHPoolDatabase } from '@sqlite.org/sqlite-wasm';
import { ChatModel } from './models/ChatModel';
import { Action } from './utils/constant';
import { Logger } from '../utils';

export interface DBOptions {}

export class DB {
  worker: Worker;
  db?: OpfsSAHPoolDatabase;
  chatModel?: ChatModel;
  private logger: Logger = Logger.scope('DB');

  constructor(public options: DBOptions = {}) {
    this.worker = new Worker(new URL('./worker.ts', import.meta.url), {
      name: 'workerAndDb',
      type: 'module',
    });
    this.createDB();
  }

  async createDB() {
    this.worker.onmessage = (event) => {
      const { action, status, result, error } = event.data;

      if (action === Action.dbReady) {
        this.logger.info('Database initialized successfully').print();

        // 创建 表
        this.createTable(result);
      } else if (action === Action.initDBError) {
        this.logger.error('Failed to initialize database:', error).print();
      }
    };

    this.worker.postMessage({ action: Action.initDB });
  }

  createTable(db: OpfsSAHPoolDatabase) {
    this.db = db;
    // 初始化数据库表
    this.chatModel = new ChatModel(this.db);
  }
}
