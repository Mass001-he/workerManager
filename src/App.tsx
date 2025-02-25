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
      const node = Node.getInstance(sharedWorker);
      const result = await node.takeOffice();
      console.log('result===>', result);
      if (result) {
        await registerService(node.service);
        await node.upperReady();
      } else {
        node.setOptions({
          onElection: async (service) => {
            await registerService(service);
          },
        });
      }

      setHasLeader(true);
      (window as any).node = node;
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

  const test = () => {
    node?.request('test', [
      {
        mid: 'mid1',
        name: '张三',
        age: 20,
      },
      {
        mid: 'mid2',
        name: '李四',
        age: 21,
        profile: 'profile1',
      },
      {
        mid: 'mid3',
        name: '王五',
        age: 22,
        avatar: '123',
      },
      {
        mid: 'mid4',
        name: '赵六',
        age: 23,
        avatar: '123',
      },
      {
        mid: 'mid5',
        name: '孙七',
        age: 24,
        avatar: '123',
      },
    ]);
  };

  const delTest = () => {
    node?.request('deleteUser', {
      mid: 'mid1',
    });
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
        <button onClick={test}>test</button>
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
