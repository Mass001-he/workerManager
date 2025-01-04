import React from "react";
import ReactDOM from "react-dom/client";
import { MessageType } from "./manager/types";

const worker = new SharedWorker(
  new URL("./manager/worker.ts", import.meta.url)
);
worker.port.start();

worker.port.postMessage({
  type: MessageType.ELECTION,
});

window.onbeforeunload = () => {
  worker.port.postMessage({
    type: MessageType.DESTROY,
  });
};

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    worker.port.postMessage({
      type: MessageType.ELECTION,
    });
  }
});

window.worker = worker;

const dates = [];
setInterval(() => {
  const date = Date.now();
  dates.push(date);
  console.log(date);
}, 100);

const rootEl = document.getElementById("root");
if (rootEl) {
  const root = ReactDOM.createRoot(rootEl);
  root.render(
    <React.StrictMode>
      <div>123</div>
    </React.StrictMode>
  );
}
