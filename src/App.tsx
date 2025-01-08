import { useEffect, useState } from 'react';
import { Client } from './manager/main';
import Server from './manager/service';

// const connectDB = async () => {
//   return 'db';
// };

// const createServices = (server: Server, db: string) => {};

const App = () => {
  const [worker, setWorker] = useState<Client | null>(null);

  useEffect(() => {
    const boot = async () => {
      const worker = await Client.create();
      worker.onElectioned(async (server: Server) => {
        // const db = await connectDB();
        // createServices(server, db);
        server.addService('return1', () => {
          console.log('handle return1');

          return 111;
          throw new Error('没有实现');
        });

        console.log('addService=======>>');
      });

      // worker.createService('return1', () => {
      //   console.log('handle return1');

      //   throw new Error('没有实现');
      // });

      setWorker(worker);
    };
    boot();
  }, []);

  const sendMessage = async () => {
    console.log('send message');
    try {
      const res = await worker?.request('return1', {
        data: {
          type: 'db',
          sql: 'select * from user',
        },
      });

      console.log('res===>', res);
    } catch (error) {}
  };

  const postManager = () => {
    console.log('postManager');
    /*  worker?.post({
      data: {
        action: 'db',
        sql: 'select * from user',
      },
    }); */
  };
  return (
    <div>
      <button onClick={postManager}>postManager</button>
      <button onClick={sendMessage}>await send message</button>
    </div>
  );
};

export default App;
