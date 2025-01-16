import { Emitter, Logger } from '../../utils';
import { isOK } from '../utils';
import type { SqliteWasmORM } from './orm';
import type { Table } from './table';

enum MetadataEnum {
  VERSION = 'version',
  SNAPSHOT = 'snapshot',
}

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

  snapshotTable() {
    return this.orm.tables.map((table) => {
      return table.toJSON();
    });
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
    if (hasMetadata === false) {
      this.logger.info('Creating metadata table').print();
      const tables = this.snapshotTable();
      this.orm.dbOriginal.exec([
        //创建metadata表
        `CREATE TABLE metadata (key TEXT NOT NULL,value TEXT NOT NULL);`,
        //创建metadata表的key的唯一索引
        `CREATE UNIQUE INDEX metadata_key ON metadata (key);`,
        //写入版本号
        `INSERT INTO metadata (key,value) VALUES ('${MetadataEnum.VERSION}','${this.version}');`,
        //写入快照
        `INSERT INTO metadata (key,value) VALUES ('${MetadataEnum.SNAPSHOT}','${JSON.stringify(
          tables,
        )}');`,
      ]);
      this._onFirstRun.fire();
    } else {
      this.checkVersion();
    }

    console.log('feat', this.snapshotTable());
  }

  private checkVersion() {
    const metadataVersion = Number(
      this.orm.exec<{ value: string }[]>(
        `SELECT value FROM metadata WHERE key='${MetadataEnum.VERSION}';`,
      )[0].value,
    );
    this.logger.info('Checking version:', metadataVersion).print();
    if (
      isNaN(metadataVersion) ||
      metadataVersion > this.version ||
      metadataVersion < 1
    ) {
      throw new Error('fatal error: Invalid version number');
    }
  }
}
