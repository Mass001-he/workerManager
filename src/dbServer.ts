import * as Comlink from 'comlink';
import { table } from './db/orm';
import { integer, text } from './db/orm/column';
import { SqliteWasmORM } from './db/orm/orm';

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

const orm = new SqliteWasmORM([userTable, postTable]);
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
  userRepo.remove({
    name: {
      equal: 'name0',
    },
  });
}, 1000);

Comlink.expose(orm);
