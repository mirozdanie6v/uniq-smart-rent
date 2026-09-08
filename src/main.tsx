import React from 'react';
import { createRoot } from 'react-dom/client';
import '../styles.css';
import './features/fleet/owner-fleet.css';
import './features/bookings/owner-calendar.css';
import './features/payments/payment-checkout.css';
import './features/crm/owner-crm.css';
import './features/team/stage7.css';
import './features/finance/owner-finance.css';
import './features/service/owner-service.css';
import { App } from './app/App';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('React root not found');

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
