import { useEffect, useState } from 'react';
import { Node } from './vertex/node';
import type { Service } from './vertex/node/service';
import { registerService } from './service';
import { SQLView } from './sqlView';
import './index.css';

const sharedWorker = new SharedWorker(new URL('./worker.ts', import.meta.url), {
  name: 'vertexWorker',
});

const App = () => {
  const [worker, setWorker] = useState<Node | null>(null);
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState(''); // 删除ID

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

  const deleteHandle = async (isHardDelete: boolean = false) => {
    if (!value) {
      return alert('请输入ID');
    }
    try {
      const res = await worker?.request('deleteMsg', {
        data: {
          deleteName: value,
          isHardDelete,
        },
      });
      console.log('deleteHandle', res);
    } catch (error) {
      console.log('error===>', error);
    }
  };

  if (!loading) {
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
          清空db
        </button>
        <button onClick={sendMessage}>有返回值发送消息 </button>
        <button onClick={broadcast}>广播</button>
        <button onClick={watchBroadcast}>监听广播</button>
      </div>

      <div>
        <button
          onClick={() => {
            deleteHandle(true);
          }}
        >
          硬删除name
        </button>
        <button onClick={() => deleteHandle()}>软删除name</button>
        <input
          type="text"
          placeholder="删除Name"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
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
