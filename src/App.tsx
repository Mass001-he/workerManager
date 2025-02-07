import { useEffect, useState } from 'react';
import { Node } from './elect/node';
import { registerService } from './service';
import { SQLView } from './sqlView';
import './index.css';
import { WebRemoteEmitter } from './utils/event/remoteEmitter';

const sharedWorker = new SharedWorker(new URL('./worker.ts', import.meta.url), {
  name: 'vertexWorker',
});

const testEmitter = new WebRemoteEmitter<string>({
  eventName: 'testEmitter',
  syncData: true,
});
testEmitter.event((e) => {
  console.log('testEmitter', e);
});

const App = () => {
  const [hasLeader, setHasLeader] = useState(false);
  const [node, setNode] = useState<Node | null>(null);

  useEffect(() => {
    const boot = async () => {
      const node = Node.getInstance(sharedWorker, {
        onElection: async (service) => {
          console.log('onElection', service);
          await registerService(service);
        },
      });

      // nodeManager -> tab1 -> Node . onElection ->

      const result = await node.takeOffice();
      console.log('result===>', result);
      if (result) {
        await registerService(node.service);
        node.upperReady();
      }

      setHasLeader(true);
      setNode(node);
    };
    boot();
  }, []);

  const sendMessage = async () => {
    try {
      const res = await node?.request('retInc1', 1);

      console.log('res===>', res);
    } catch (error) {
      console.log('error===>', error);
    }
  };

  const broadcast = () => {
    node?.broadcast({
      type: '更新会话详情',
      ids: [1, 2, 3],
    });
  };

  const watchBroadcast = () => {
    node?.onBroadcast((data) => {
      console.log('watchBroadcast', data);
    });
  };

  if (!node || !hasLeader) {
    return null;
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
      }}
    >
      <div>
        <button
          onClick={() => {
            window.deleteSqlite();
          }}
        >
          clearDBd
        </button>
        <button
          onClick={() => {
            node.request('test', {});
          }}
        >
          test
        </button>
        <button onClick={sendMessage}>有返回值发送消息 </button>
        <button onClick={broadcast}>广播</button>
        <button onClick={watchBroadcast}>监听广播</button>
        <button
          onClick={() => {
            testEmitter.fire('test');
          }}
        >
          测试RemoteEmitter
        </button>
        <button
          onClick={() => {
            testEmitter.dispose();
          }}
        >
          销毁RemoteEmitter
        </button>
      </div>
      <div
        style={{
          width: '100%',
          height: 0,
          flex: 1,
        }}
      >
        <SQLView
          exec={async (sql) => {
            await node?.request('exec', sql);
          }}
          query={async (sql) => {
            const res = await node?.request('exec', sql);
            return res?.data;
          }}
        />
      </div>
    </div>
  );
};

export default App;
