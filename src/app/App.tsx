import { AppProviders } from './providers/AppProviders';
import { LegacyBridge } from './legacy/LegacyBridge';

export function App() {
  return (
    <AppProviders>
      <LegacyBridge />
    </AppProviders>
  );
}
