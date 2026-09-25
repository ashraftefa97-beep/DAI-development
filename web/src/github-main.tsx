import React from 'react';
import ReactDOM from 'react-dom/client';
import GithubApp from './GithubApp';
import AuthGate from './AuthGate';
import MarketingPage from './MarketingPage';
import './index.css';

const introMode=new URLSearchParams(window.location.search).get('intro')==='1';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {introMode
      ? <MarketingPage />
      : <AuthGate><GithubApp /></AuthGate>}
  </React.StrictMode>
);


if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const hadController=Boolean(navigator.serviceWorker.controller);

    void navigator.serviceWorker.register('./sw.js').then(registration=>{
      const check=()=>void registration.update().catch(()=>undefined);
      const onVisibility=()=>{ if(document.visibilityState==='visible')check(); };

      window.setInterval(check,5*60*1000);
      document.addEventListener('visibilitychange',onVisibility);
    }).catch((error) => {
      console.warn('DAI PWA service worker registration failed', error);
    });

    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      if(hadController){
        window.dispatchEvent(new CustomEvent('dai:update-ready'));
      }
    });
  });
}
