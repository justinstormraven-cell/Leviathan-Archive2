import { createRoot } from 'react-dom/client';
import { setAuthTokenGetter } from '@workspace/api-client-react';

import App from './App';

import './index.css';

// The live shell is gated behind an operator token. The generated API client
// attaches it as a Bearer header on every request when present.
setAuthTokenGetter(() => localStorage.getItem('stormraven_token'));

createRoot(document.getElementById('root')!).render(<App />);
