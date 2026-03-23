console.log('PakuaCV: JS bundle loaded');

// Ensure process.env is defined for libraries that expect it
if (typeof window !== 'undefined' && !window.process) {
  // @ts-ignore
  window.process = { env: {} };
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

console.log('PakuaCV: App initialization started');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
