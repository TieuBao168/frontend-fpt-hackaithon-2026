import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@fontsource/be-vietnam-pro/400.css';
import '@fontsource/be-vietnam-pro/500.css';
import '@fontsource/be-vietnam-pro/600.css';
import '@fontsource/be-vietnam-pro/700.css';
import '@fontsource/be-vietnam-pro/800.css';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dropzone/styles.css';
import './app/global.css';
import './app/shell.css';

import { App } from './app/App';

async function enableMocking() {
  if (import.meta.env.VITE_USE_MOCK === 'false') return;
  const { worker } = await import('./mocks/browser');
  await worker.start({ quiet: true });
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
