import React from 'react';
import ReactDOM from 'react-dom/client';
import GithubApp from './GithubApp';
import AuthGate from './AuthGate';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthGate>
      <GithubApp />
    </AuthGate>
  </React.StrictMode>
);


if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('./sw.js').catch((error) => {
      console.warn('DAI PWA service worker registration failed', error);
    });
  });
}
