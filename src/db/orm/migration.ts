import { Emitter, Logger } from '../../utils';
import { isOK } from '../utils';
import type { SqliteWasmORM } from './orm';
import type { Table } from './table';

export class Migration<T extends Table[]> {
  private logger = Logger.scope('ORM.Migration');
  private _onFirstRun = new Emitter();
  public onFirstRun = this._onFirstRun.event;

  constructor(private orm: SqliteWasmORM<T>) {
    this.onFirstRun(() => {
      this.createTable();
    });
  }

  private createTable() {
    this.logger.info('Loading models:', this.orm.tables).print();
    const sql = this.orm.tables
      .map((table) => {
        return table.genCreateSql();
      })
      .join('\n');
    return this.orm.exec(sql);
  }

  get version() {
    return this.orm.version;
  }

  public init() {
    this.logger.info('Initializing metadata').print();
    //查询是否存在metadata表
    const sql = `SELECT name FROM sqlite_master WHERE type='table' AND name='metadata';`;
    const result = this.orm.exec<any[]>(sql);
    const hasMetadata = isOK(result);
    if (!hasMetadata) {
      this.logger.info('Creating metadata table').print();
      this.orm.exec(
        `CREATE TABLE metadata (key TEXT NOT NULL,value TEXT NOT NULL);`,
      );
      this._onFirstRun.fire();
    }
    this.checkVersion();
  }

  private checkVersion() {
    const metadataVersion = this.orm.exec<{ value: string }[]>(
      `SELECT value FROM metadata WHERE key='version';`,
    );
    const hasVersion = isOK(metadataVersion);
    if (hasVersion) {
      this.logger.info('Metadata version not found').print();
      this.orm.exec(
        `INSERT INTO metadata (key,value) VALUES ('version','${this.version}');`,
      );
      this.logger.info('Metadata version set to', this.version).print();
    }
  }
}
