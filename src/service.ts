import { DBClient } from './db/dbClient';
import type { Service } from './vertex/node/service';

export async function registerService(service: Service) {
  console.log('registerService', service);
  const dbClient = await new DBClient([
    {
      name: 'string',
      age: 'number',
    },
  ]);
  await dbClient.connect('user.db');
  service.onDestroy(async () => {
    await dbClient.close();
  });
  // console.log('isOpen', isOpen);
  // // await dbClient.exec(
  // //   `CREATE TABLE IF NOT EXISTS user (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)`,
  // // );
  // // await dbClient.exec(`INSERT INTO user (name) VALUES ('test')`);
  // // await dbClient.exec(`INSERT INTO user (name) VALUES ('test2')`);
  // // await dbClient.exec(`INSERT INTO user (name) VALUES ('test3')`);
  // const res = await dbClient.exec('select * from user');
  // console.log('res', res);
}
