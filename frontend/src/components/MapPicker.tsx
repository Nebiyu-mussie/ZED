import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMapEvents, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Button } from './ui/Button';

import 'leaflet/dist/leaflet.css';

const defaultIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

const SEARCH_ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const REVERSE_ENDPOINT = 'https://nominatim.openstreetmap.org/reverse';

const cache = new Map<string, any>();

interface MapPickerProps {
  label: string;
  address: string;
  coords: { lat: number | null; lng: number | null };
  onAddressChange: (value: string) => void;
  onCoordsChange: (coords: { lat: number; lng: number }, address?: string) => void;
  zoneStatus?: { ok: boolean; message?: string; zone?: string } | null;
  showRouteTo?: { lat: number; lng: number } | null;
}

function ClickHandler({ locked, onPick }: { locked: boolean; onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (!locked) onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapPicker({ label, address, coords, onAddressChange, onCoordsChange, zoneStatus, showRouteTo }: MapPickerProps) {
  const [search, setSearch] = useState(address);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [locked, setLocked] = useState(false);
  const [mismatch, setMismatch] = useState(false);

  useEffect(() => {
    setSearch(address);
  }, [address]);

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (!search || search.length < 3) {
        setSuggestions([]);
        return;
      }
      setLoading(true);
      const cacheKey = `search:${search}`;
      if (cache.has(cacheKey)) {
        setSuggestions(cache.get(cacheKey));
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${SEARCH_ENDPOINT}?format=json&q=${encodeURIComponent(search)}&limit=5&addressdetails=1&countrycodes=et`);
        const data = await res.json();
        cache.set(cacheKey, data);
        setSuggestions(data);
      } catch (err) {
        setError('Search failed. Try again.');
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  const reverseGeocode = async (lat: number, lng: number) => {
    const cacheKey = `rev:${lat.toFixed(5)}:${lng.toFixed(5)}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey);
    const res = await fetch(`${REVERSE_ENDPOINT}?format=json&lat=${lat}&lon=${lng}`);
    const data = await res.json();
    cache.set(cacheKey, data);
    return data;
  };

  const handlePick = async (lat: number, lng: number) => {
    try {
      setLoading(true);
      const data = await reverseGeocode(lat, lng);
      const display = data?.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      onCoordsChange({ lat, lng }, display);
      onAddressChange(display);
      setMismatch(false);
    } catch (err) {
      setError('Unable to resolve address');
      onCoordsChange({ lat, lng });
    } finally {
      setLoading(false);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => handlePick(pos.coords.latitude, pos.coords.longitude),
      () => setError('Location permission denied')
    );
  };

  const handleSelectSuggestion = (item: any) => {
    const lat = Number(item.lat);
    const lng = Number(item.lon);
    const display = item.display_name;
    onCoordsChange({ lat, lng }, display);
    onAddressChange(display);
    setSearch(display);
    setSuggestions([]);
    setMismatch(false);
  };

  const handleManualEdit = (value: string) => {
    setSearch(value);
    onAddressChange(value);
    if (coords.lat && coords.lng) {
      setMismatch(true);
    }
  };

  const confirmLocation = async () => {
    if (coords.lat && coords.lng) {
      await handlePick(coords.lat, coords.lng);
      setLocked(true);
    }
  };

  const routeLine = useMemo(() => {
    if (!showRouteTo || !coords.lat || !coords.lng) return null;
    return [[coords.lat, coords.lng], [showRouteTo.lat, showRouteTo.lng]] as [number, number][];
  }, [coords, showRouteTo]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <div className="flex items-center gap-2">
          <button type="button" className="text-xs text-[#F28C3A]" onClick={useMyLocation}>Use my location</button>
          <button type="button" className="text-xs text-[#2A1B7A]" onClick={() => setLocked((prev) => !prev)}>
            {locked ? 'Unlock' : 'Lock pin'}
          </button>
        </div>
      </div>

      <div className="relative">
        <input
          value={search}
          onChange={(e) => handleManualEdit(e.target.value)}
          className="w-full h-11 rounded-xl border border-gray-300 px-3"
          placeholder="Search address"
        />
        {loading && <div className="absolute right-3 top-3 text-xs text-gray-400">Loading...</div>}
      </div>

      {mismatch && (
        <p className="text-xs text-orange-500">Address text doesn’t match the pinned location. Confirm to sync.</p>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}

      {suggestions.length > 0 && (
        <div className="border border-gray-100 rounded-xl overflow-hidden bg-white shadow-sm">
          {suggestions.map((item) => (
            <button
              key={item.place_id}
              type="button"
              onClick={() => handleSelectSuggestion(item)}
              className="w-full text-left px-4 py-2 text-xs text-gray-600 hover:bg-gray-50"
            >
              {item.display_name}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-2xl overflow-hidden border border-gray-100 bg-gray-50">
        <MapContainer
          center={[coords.lat || 8.98, coords.lng || 38.75]}
          zoom={13}
          style={{ height: 220, width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler locked={locked} onPick={handlePick} />
          {coords.lat && coords.lng && (
            <Marker position={[coords.lat, coords.lng]} draggable={!locked} eventHandlers={{ dragend: (e) => {
              const marker = e.target as L.Marker;
              const pos = marker.getLatLng();
              handlePick(pos.lat, pos.lng);
            } }} />
          )}
          {routeLine && <Polyline positions={routeLine} color="#F28C3A" />}
        </MapContainer>
      </div>

      <div className="flex items-center justify-between">
        {zoneStatus && !zoneStatus.ok && <p className="text-xs text-red-500">{zoneStatus.message}</p>}
        {zoneStatus?.ok && <p className="text-xs text-green-600">{zoneStatus.zone}</p>}
        <Button type="button" variant="outline" size="sm" onClick={confirmLocation}>Confirm location</Button>
      </div>
    </div>
  );
}
