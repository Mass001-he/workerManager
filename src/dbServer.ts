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
    };
  },
);

const postTable = table(
  'post',
  {
    title: text(),
    content: text(),
  },
  () => {
    return {
      unique: ['title', 'content'],
    };
  },
);

const classTable = table('class', {
  name: text(),
  teacher: text(),
});

const studentTable = table('student', {
  name: text(),
  age: integer(),
  classId: integer(),
});

const orm = new SqliteWasmORM({
  tables: [userTable, postTable],
  version: 2,
});
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
