import { useEffect, useRef, useState } from 'react';
import { InitSharedWorker } from './manager/main';
import { MessageType } from './manager/types';
import { generateReqId } from './manager/utils';

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
    const res = await worker?.requestManager({
      data: {
        type: 'db',
        sql: 'select * from user',
      },
    });

    console.log('res===>', res);
  };

  const postManager = () => {
    console.log('put message');
    worker?.postManager({
      data: {
        action: 'db',
        sql: 'select * from user',
      },
    });
  };
  return (
    <div>
      <button onClick={postManager}>send message</button>
      <button onClick={sendMessage}>await send message</button>
    </div>
  );
};

export default App;
