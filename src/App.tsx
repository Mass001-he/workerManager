import { useEffect, useState } from 'react';
import { Node } from './vertex/node';
import type { Service } from './vertex/node/service';
import { registerService } from './service';
import { SQLView } from './sqlView';

const sharedWorker = new SharedWorker(new URL('./worker.ts', import.meta.url), {
  name: 'vertexWorker',
});

const App = () => {
  const [worker, setWorker] = useState<Node | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const boot = async () => {
      const node = await Node.create(sharedWorker, {
        onElection: async (service: Service) => {
          await registerService(service);
          setLoading(true);
        },
      });
      setWorker(node);
    };
    boot();

    return () => {
      worker?.destroy();
    };
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

  const addChat = () => {
    // db.chatModel?.add();
  };
  const searchAllChat = async () => {};
  if (!loading) {
    return null;
  }
  return (
    <div>
      <button
        onClick={() => {
          window.deleteSqlite();
        }}
      >
        清空db
      </button>
      <button onClick={postManager}>无返回值发送消息</button>
      <button onClick={sendMessage}>有返回值发送消息 </button>
      <button onClick={broadcast}>广播</button>
      <button onClick={watchBroadcast}>监听广播</button>

      <div>
        <button onClick={addChat}>db添加chat</button>
        <button onClick={searchAllChat}>查询所有聊天</button>
      </div>

      <div
        style={{
          width: '100%',
          height: 400,
        }}
      >
        <SQLView
          exec={async (sql) => {
            await worker?.request('exec', sql);
          }}
          query={async (sql) => {
            const res = await worker?.request('exec', sql);
            return res?.data;
          }}
        />
      </div>
    </div>
  );
};

export default App;
