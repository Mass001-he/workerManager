import { useEffect, useState } from 'react';
import { InitSharedWorker } from './manager/main';

const App = () => {
  const [worker, setWorker] = useState<InitSharedWorker | null>(null);

  useEffect(() => {
    const boot = async () => {
      const worker = await InitSharedWorker.create();
      setWorker(worker);
    };
    boot();
  }, []);

  const sendMessage = async () => {
    console.log('send message');
    const res = await worker?.request({
      data: {
        type: 'db',
        sql: 'select * from user',
      },
    });

    console.log('res===>', res);
  };

  const postManager = () => {
    console.log('postManager');
    worker?.post({
      data: {
        action: 'db',
        sql: 'select * from user',
      },
    });
  };
  return (
    <div>
      <button onClick={postManager}>postManager</button>
      <button onClick={sendMessage}>await send message</button>
    </div>
  );
};

export default App;