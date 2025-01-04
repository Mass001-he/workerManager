import React from "react";
import ReactDOM from "react-dom/client";
import { MessageType } from "./manager/types";
import { InitSharedWorker } from "./manager/main"
import { generateReqId } from "./manager/utils";

// const worker = new SharedWorker(
//   new URL("./manager/worker.ts", import.meta.url),
//   {
//     name: "managerWorker",
//   }
// );

const worker = new InitSharedWorker(
  new URL("./manager/worker.ts", import.meta.url),
  {
    name: "managerWorker",
  }
);

worker.initStatus

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

(window as any).worker = worker;

// const dates = [];
// setInterval(() => {
//   const date = Date.now();
//   dates.push(date);
//   console.log(date);
// }, 100);

const rootEl = document.getElementById("root");
if (rootEl) {
  const root = ReactDOM.createRoot(rootEl);
  root.render(
    <React.StrictMode>
      <div>123</div>
    </React.StrictMode>
  );
}
