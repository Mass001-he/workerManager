import { createWorker } from './db/dbClient';
import type { Service } from './vertex/node/service';

declare global {
  interface Window {
    closeWorker: () => void;
  }
}

export async function registerService(service: Service) {
  console.log('registerService', service);
  const { dbClient, close } = await createWorker();
  window.closeWorker = close;
  await dbClient.connect('test.db');
  service.onDestroy(close);
  service.add('createTable', async () => {
    // dbClient.models
    //创建表
    await dbClient.exec(
      `CREATE TABLE IF NOT EXISTS user (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT);`,
    );
    await dbClient.exec(`INSERT INTO user (name) VALUES ('张三');`);
    await dbClient.exec(`INSERT INTO user (name) VALUES ('李四');`);
    await dbClient.exec(`INSERT INTO user (name) VALUES ('王五');`);
    await dbClient.exec(`INSERT INTO user (name) VALUES ('赵六');`);
    return '创建表成功';
  });
  service.add('getTest', async (data: string) => {
    //拿到所有的表
    return dbClient.exec(data);
  });
}
