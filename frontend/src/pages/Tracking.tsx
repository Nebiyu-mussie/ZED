import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Map as MapIcon, Package, CheckCircle, Clock, Phone, MessageSquare, Shield, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { io, Socket } from 'socket.io-client';
import { apiFetch, formatCurrency, formatShortDate } from '../lib/api';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export default function Tracking() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number; updated_at?: string } | null>(null);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<{ sender: string; text: string; time: string }[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : { name: 'Guest', role: 'customer' };

  useEffect(() => {
    socketRef.current = io();

    socketRef.current.on('receive_message', (message: { sender: string; text: string; time: string }) => {
      setMessages((prev) => [...prev, message]);
    });

    socketRef.current.on('order_updated', (updatedOrder: any) => {
      if (updatedOrder.id?.toString() === id) {
        setOrder(updatedOrder);
      }
    });

    socketRef.current.on('driver_location', (payload: any) => {
      if (!payload || typeof payload.lat !== 'number' || typeof payload.lng !== 'number') return;
      setDriverLocation({ lat: payload.lat, lng: payload.lng, updated_at: payload.updated_at });
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isChatOpen]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !socketRef.current) return;

    const msgData = {
      deliveryId: id,
      sender: user.name,
      text: newMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    socketRef.current.emit('send_message', msgData);
    setNewMessage('');
  };

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiFetch(`/api/track/${id}`);
        setOrder(data.order);
        setEvents(data.events || []);
        setDriverLocation(data.driverLocation || null);
        if (data.order?.id) {
          socketRef.current?.emit('join_delivery', data.order.id);
        }
      } catch (error) {
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-[#2A1B7A] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium">Locating your delivery...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-gray-500 font-medium">Delivery not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2A1B7A]">Track Delivery</h1>
          <p className="text-gray-500">Order #{order.id}</p>
        </div>
        <div className="bg-orange-100 text-[#F28C3A] px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2">
          <Clock className="w-4 h-4" /> Status: {order.status.replace('_', ' ')}
        </div>
      </div>

      <div className="bg-gray-200 h-64 md:h-96 rounded-3xl overflow-hidden relative border border-gray-200 shadow-sm">
        {(() => {
          const pickupLat = Number(order?.pickup_lat);
          const pickupLng = Number(order?.pickup_lng);
          const dropoffLat = Number(order?.dropoff_lat);
          const dropoffLng = Number(order?.dropoff_lng);
          const driverLat = driverLocation ? Number(driverLocation.lat) : NaN;
          const driverLng = driverLocation ? Number(driverLocation.lng) : NaN;

          const hasPickup = Number.isFinite(pickupLat) && Number.isFinite(pickupLng);
          const hasDropoff = Number.isFinite(dropoffLat) && Number.isFinite(dropoffLng);
          const hasDriver = Number.isFinite(driverLat) && Number.isFinite(driverLng);

          const center: [number, number] = hasDriver
            ? [driverLat, driverLng]
            : hasPickup
            ? [pickupLat, pickupLng]
            : hasDropoff
            ? [dropoffLat, dropoffLng]
            : [9.03, 38.74];

          return (
            <>
              <MapContainer center={center} zoom={13} scrollWheelZoom={false} className="h-full w-full">
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {hasPickup && (
                  <Marker position={[pickupLat, pickupLng]}>
                    <Popup>Pickup location</Popup>
                  </Marker>
                )}
                {hasDropoff && (
                  <Marker position={[dropoffLat, dropoffLng]}>
                    <Popup>Drop-off location</Popup>
                  </Marker>
                )}
                {hasDriver && (
                  <Marker position={[driverLat, driverLng]}>
                    <Popup>Driver is here</Popup>
                  </Marker>
                )}
                {hasPickup && hasDropoff && (
                  <Polyline positions={[[pickupLat, pickupLng], [dropoffLat, dropoffLng]]} pathOptions={{ color: '#2A1B7A' }} />
                )}
              </MapContainer>
              {!hasPickup && !hasDropoff && !hasDriver && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                  <div className="text-center space-y-2">
                    <MapIcon className="w-12 h-12 text-gray-400 mx-auto" />
                    <p className="text-gray-500 font-medium">Waiting for coordinates...</p>
                    <p className="text-xs text-gray-400">Once a driver is assigned, live tracking appears here.</p>
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-[#2A1B7A] flex items-center gap-2"><Package className="w-5 h-5" /> Parcel</h3>
          <p className="text-sm text-gray-500 mt-2">{order.package_type} • {order.package_size} • {order.package_weight} kg</p>
          <p className="text-sm text-gray-500">{order.pickup_address} → {order.dropoff_address}</p>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-[#2A1B7A] flex items-center gap-2"><Phone className="w-5 h-5" /> Contact</h3>
          <p className="text-sm text-gray-500 mt-2">Pickup: {order.pickup_contact_name}</p>
          <p className="text-sm text-gray-500">Drop-off: {order.dropoff_contact_name}</p>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-[#2A1B7A] flex items-center gap-2"><Shield className="w-5 h-5" /> Payment</h3>
          <p className="text-sm text-gray-500 mt-2">Total: {formatCurrency(order.total || 0)}</p>
          <p className="text-sm text-gray-500">Created: {formatShortDate(order.created_at)}</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-bold text-[#2A1B7A]">Order Timeline</h3>
        <div className="mt-4 space-y-4">
          {events.map((event) => (
            <div key={event.id} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#F28C3A]/10 flex items-center justify-center text-[#F28C3A]">
                <CheckCircle className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">{event.event_type.replace('_', ' ')}</p>
                <p className="text-xs text-gray-400">{event.note || ''}</p>
              </div>
            </div>
          ))}
          {events.length === 0 && <p className="text-sm text-gray-400">No updates yet.</p>}
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-[#2A1B7A] flex items-center gap-2"><MessageSquare className="w-5 h-5" /> Support Chat</h3>
          <Button variant="outline" onClick={() => setIsChatOpen(!isChatOpen)}>{isChatOpen ? 'Close' : 'Open'}</Button>
        </div>
        {isChatOpen && (
          <div className="mt-4 space-y-4">
            <div className="max-h-60 overflow-y-auto bg-gray-50 rounded-2xl p-4">
              {messages.map((message, index) => (
                <div key={index} className={`mb-3 ${message.sender === user.name ? 'text-right' : ''}`}>
                  <div className={`inline-block px-4 py-2 rounded-xl ${message.sender === user.name ? 'bg-[#2A1B7A] text-white' : 'bg-white text-gray-700'}`}>
                    <p className="text-sm">{message.text}</p>
                    <span className="text-xs opacity-70">{message.time}</span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={sendMessage} className="flex gap-2">
              <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type your message" />
              <Button type="submit" className="bg-[#F28C3A] hover:bg-[#F28C3A]/90">Send</Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
