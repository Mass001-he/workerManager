import * as Comlink from 'comlink';
import { Repository, table } from './db/orm';
import { col } from './db/orm/column';
import { SqliteWasmORM } from './db/orm/orm';

const { text, integer } = col;
const userTable = table(
  'user',
  {
    name: text(),
    age: integer().max(100),
  },
  () => {
    return {
      unique: ['name'],
    };
  },
);

const postTable = table('post', {
  title: text(),
  content: text(),
});
const version1 = {
  tables: [userTable],
  version: 1,
};

const version2 = {
  tables: [
    table(
      'user',
      {
        mid: text().primary(),
        name: text(),
        age: integer().max(100),
        profile: text().default('123'),
        avatar: text().optional(),
        nickname: text().optional(),
        abc: integer().default(1),
      },
      () => {
        return {
          unique: ['name'],
        };
      },
    ),
    postTable,
  ],
  version: 2,
};

const orm = new SqliteWasmORM(version2);
const userRepo = orm.getRepository('user');

//test
setTimeout(() => {}, 1000);

function connect(name: string) {
  return orm.connect(name);
}

function exec(sql: string) {
  return orm.exec(sql);
}

type ORMType = typeof orm;
type Tables = ORMType['tables'];
type TableNames = Tables[number]['name'];
type GetTableType<T extends TableNames> = Extract<Tables[number], { name: T }>;

function callRepo<
  N extends TableNames,
  T extends GetTableType<N>,
  M extends keyof Repository<T>,
>(name: N, method: M, params: Parameters<Repository<T>[M]>) {
  const repo = orm.getRepository(name);
  return repo[method](...params);
}

const rpc = {
  connect,
  callRepo,
  exec,
};

export type RpcType = typeof rpc;

Comlink.expose(rpc);
