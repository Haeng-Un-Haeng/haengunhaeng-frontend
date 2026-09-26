import { MapView } from './MapView';
import { MapUiStoreProvider } from '../model/provider';

export function MapPage() {
  return (
    <MapUiStoreProvider>
      <MapContent />
    </MapUiStoreProvider>
  );
}

function MapContent() {
  return (
    <main>
      <MapView />
    </main>
  );
}
