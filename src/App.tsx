import { useEffect, useState } from 'react';
import { Node } from './vertex/node';
import type { Service } from './vertex/node/service';
// const sharedWorker = new SharedWorker(new URL('./worker.ts', import.meta.url), {
//   name: 'vertexWorker',
// });
const fsWorker = new Worker(new URL('./fsWorker.ts', import.meta.url), {
  name: 'fsWorker',
});

const App = () => {
  const [worker, setWorker] = useState<Node | null>(null);

  useEffect(() => {
    const boot = async () => {
      // const worker = await Node.create(sharedWorker);
      // worker.onElection(async (service: Service) => {
      //   service.add('return1', () => {
      //     throw new Error('没有实现');
      //     return 111;
      //   });
      // });
      // setWorker(worker);
    };
    boot();
  }, []);

  const sendMessage = async () => {
    try {
      const res = await worker?.request('return1', {
        data: 'data',
      });

      console.log('res===>', res);
    } catch (error) {
      console.log('error===>', error);
    }
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

  const broadcast = () => {
    worker?.broadcast({
      type: '更新会话详情',
      ids: [1, 2, 3],
    });
  };

  const watchBroadcast = () => {
    worker?.onBroadcast((data) => {
      console.log('watchBroadcast', data);
    });
  };
  return (
    <div>
      <button onClick={postManager}>无返回值发送消息</button>
      <button onClick={sendMessage}>有返回值发送消息 </button>
      <button onClick={broadcast}>广播</button>
      <button onClick={watchBroadcast}>监听广播</button>
    </div>
  );
};

export default App;
