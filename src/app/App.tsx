import { AppProviders } from './providers/AppProviders';
import { PrototypeApp } from '../features/prototype/PrototypeApp';

export function App() {
  return (
    <AppProviders>
      <PrototypeApp />
    </AppProviders>
  );
}
