import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

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
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
