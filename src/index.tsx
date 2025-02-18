import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const workerCode = `
console.log('Worker started');

`;
const blob = new Blob([workerCode], { type: 'application/javascript' });
const worker = new SharedWorker(URL.createObjectURL(blob), {
  name: 'myWorker',
});

// const dates = [];
// setInterval(() => {
//   const date = Date.now();
//   dates.push(date);
//   console.log(date);
// }, 100);

const rootEl = document.getElementById('root');
if (rootEl) {
  const root = ReactDOM.createRoot(rootEl);
  root.render(
    <>
      <App />
    </>,
  );
}
