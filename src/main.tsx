import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AccountPortal } from './components/AccountPortal';
import './styles/global.css';
import './styles/responsive.css';
import './styles/accounts.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AccountPortal />
  </StrictMode>,
);
