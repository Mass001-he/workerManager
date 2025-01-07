import { useEffect, useState } from 'react';
import { InitSharedWorker } from './manager/main';

const App = () => {
  const [worker, setWorker] = useState<InitSharedWorker | null>(null);

  useEffect(() => {
    const boot = async () => {
      const worker = await InitSharedWorker.create();
      worker.createService('return1', () => {
        console.log('handle return1');

        throw new Error('没有实现');
      });
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
