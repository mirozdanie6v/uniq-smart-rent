import React from 'react';
import { createRoot } from 'react-dom/client';
import '../styles.css';
import './features/fleet/owner-fleet.css';
import './features/bookings/owner-calendar.css';
import { App } from './app/App';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('React root not found');

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
