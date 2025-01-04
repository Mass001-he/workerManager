import { useEffect, useRef } from 'react'
import { InitSharedWorker } from './manager/main';
import { MessageType } from './manager/types';
import { generateReqId } from './manager/utils';

const App = () => {
  const workerRef = useRef<InitSharedWorker | null>(null)
  useEffect(() => {
    const worker = workerRef.current = new InitSharedWorker();

    worker.onMessage(() => {
      (window as any).worker = worker;
      console.log("worker connected")

      worker.postManager({
        type: MessageType.CAMPAIGN,
        reqId: generateReqId(),
      });

      window.onbeforeunload = () => {
        worker.postManager({
          reqId: generateReqId(),
          type: MessageType.DESTROY,
        });
      };

      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          worker.postManager({
            type: MessageType.CAMPAIGN,
            reqId: generateReqId(),
          });
        }
      });

      window.onbeforeunload = () => {
        worker.postManager({
          reqId: generateReqId(),
          type: MessageType.DESTROY,
        });
      };

      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          worker.postManager({
            type: MessageType.CAMPAIGN,
            reqId: generateReqId(),
          });
        }
      });
    })
  }, [])
  const sendMessage = async () => {
    console.log('send message')
    const res = await workerRef.current?.requestManager({
      reqId: generateReqId(),
      data: {
        type: 'db',
        sql: 'select * from user',
      }
    });

    console.log('res===>', res)
  }
  return (
    <div>
      <button onClick={sendMessage}>send message</button>
    </div>
  )
}

export default App
