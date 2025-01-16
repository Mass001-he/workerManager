import * as Comlink from 'comlink';
import { table } from './db/orm';
import { col } from './db/orm/column';
import { SqliteWasmORM } from './db/orm/orm';

const { text, integer } = col;
const userTable = table('user', {
  name: text().optional(),
  age: integer().max(100),
});

const postTable = table(
  'post',
  {
    title: text(),
    content: text(),
  },
  () => {
    return {
      unique: ['title'],
    };
  },
);

const orm = new SqliteWasmORM({
  tables: [userTable, postTable],
  version: 1,
});
const userRepo = orm.getRepository('user');
//test
setTimeout(() => {
  // const users = [];
  // for (let i = 0; i < 101; i++) {
  //   users.push({
  //     name: `name${i}`,
  //     age: i,
  //   });
  // }
  // userRepo.insertMany(users);
  userRepo.updateMany(
    {
      name: {
        like: 'name1',
      },
    },
    {
      age: 99,
    },
    {
      fast: true,
    },
  );
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
