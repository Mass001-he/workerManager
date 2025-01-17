import * as Comlink from 'comlink';
import { table } from './db/orm';
import { col } from './db/orm/column';
import { SqliteWasmORM } from './db/orm/orm';

const { text, integer } = col;
const userTable = table(
  'user',
  {
    name: text().optional(),
    age: integer().max(100),
    profile: text(),
    avatar: text(),
  },
  () => {
    return {
      index: ['name'],
      composite: {
        name_age: ['name', 'age'],
      },
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
        name: text(),
        age: integer().max(100),
        profile: text(),
        nickname: text(),
      },
      () => {
        return {
          index: ['age'],
          composite: {
            name_nickname: ['name', 'nickname'],
          },
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
setTimeout(() => {
  const users = [];
  for (let i = 0; i < 101; i++) {
    users.push({
      name: `name${i}`,
      age: i,
    });
  }
  // userRepo.insertMany(users);

  // userRepo.updateMany(
  //   {
  //     name: {
  //       like: 'name1',
  //     },
  //   },
  //   {
  //     age: 99,
  //   },
  //   {
  //     fast: true,
  //   },
  // );
  // userRepo.remove(
  //   {
  //     name: {
  //       equal: 'name5',
  //     },
  //   },
  //   {
  //     isHardDelete: true,
  //     fast: true,
  //   },
  // );
  // userRepo.removeMany({
  //   name: {
  //     like: 'name1',
  //   },
  // });

  userRepo.queryMany({
    rowid: {
      gt: 10,
    },
  });
}, 1000);

Comlink.expose(orm);
