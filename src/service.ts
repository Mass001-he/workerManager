import { DBClient } from './db/dbClient';
import type { Service } from './vertex/node/service';

export async function registerService(service: Service) {
  console.log('registerService', service);
  const dbClient = await new DBClient();
  await dbClient.connect('user.db', { directory: 'test' });
  // await dbClient.exec(
  //   `CREATE TABLE IF NOT EXISTS user (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)`,
  // );
  // await dbClient.exec(`INSERT INTO user (name) VALUES ('test')`);
  // await dbClient.exec(`INSERT INTO user (name) VALUES ('test2')`);
  // await dbClient.exec(`INSERT INTO user (name) VALUES ('test3')`);
}