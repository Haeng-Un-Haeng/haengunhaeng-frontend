import { MapUiStoreProvider } from '../model/provider';

export function MapPage() {
  return (
    <MapUiStoreProvider>
      <MapContent />
    </MapUiStoreProvider>
  );
}

function MapContent() {
  return <main>지도 화면</main>;
}
