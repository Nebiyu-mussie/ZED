import React, { useEffect, useMemo, useState } from 'react';
import { Package, MapPin, Phone, DollarSign, Clock, Bell } from 'lucide-react';
import { formatShortDate, formatCurrency, apiFetch } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import ParcelCalculator from '../components/ParcelCalculator';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 border-gray-200',
  confirmed: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  driver_assigned: 'bg-blue-100 text-blue-800 border-blue-200',
  picked_up: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  in_transit: 'bg-purple-100 text-purple-800 border-purple-200',
  delivered: 'bg-green-100 text-green-800 border-green-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  returned: 'bg-orange-100 text-orange-800 border-orange-200',
  failed: 'bg-red-100 text-red-800 border-red-200',
};

const HISTORY_STATUSES = ['confirmed', 'driver_assigned', 'picked_up', 'in_transit', 'delivered', 'completed', 'cancelled', 'returned', 'failed'];

const dedupeNotifications = (items: any[]) => {
  const seen = new Set<string>();
  const deduped: any[] = [];
  for (const item of items || []) {
    const timestamp = item?.created_at ? new Date(item.created_at).toISOString().slice(0, 16) : '';
    const key = `${item?.type || ''}|${item?.title || ''}|${item?.body || ''}|${timestamp}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }
  return deduped;
};

export default function CustomerDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [prefs, setPrefs] = useState({ inapp: true, sms: true, email: true });
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'addresses' | 'preferences'>('home');
  const [statusFilter, setStatusFilter] = useState('all');
  const [newAddress, setNewAddress] = useState({ label: '', address: '' });
  const navigate = useNavigate();
  const toast = useToast();

  const fetchAll = async () => {
    try {
      const [ordersData, addressData] = await Promise.all([
        apiFetch('/api/orders'),
        apiFetch('/api/addresses'),
      ]);
      setOrders(ordersData);
      setAddresses(addressData);

      const [prefData, notifData] = await Promise.all([
        apiFetch('/api/notifications/preferences'),
        apiFetch('/api/notifications'),
      ]);
      setPrefs({
        inapp: prefData.inapp === 1 || prefData.inapp === true,
        sms: prefData.sms === 1 || prefData.sms === true,
        email: prefData.email === 1 || prefData.email === true,
      });
      setNotifications(dedupeNotifications(notifData || []));
    } catch (error) {
      toast.push({ title: 'Unable to load dashboard', description: 'Please refresh and try again.', variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleCreate = async (data: any) => {
    try {
      const order = await apiFetch('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          pickup: data.pickup,
          dropoff: data.dropoff,
          pickupContactName: data.pickupContactName,
          pickupContactPhone: data.pickupContactPhone,
          dropoffContactName: data.dropoffContactName,
          dropoffContactPhone: data.dropoffContactPhone,
          packageType: data.packageType,
          packageSize: data.size,
          packageWeight: Number(data.weight),
          serviceType: data.serviceType,
          notes: data.notes,
          insurance: false,
          promoCode: data.promoCode,
          scheduleType: data.serviceType === 'scheduled' ? 'scheduled' : 'now',
          scheduledTime: data.scheduledTime || null,
          paymentMethod: data.paymentMethod || 'cash',
        }),
      });
      if (data.paymentMethod === 'chapa') {
        submitChapaHostedCheckout(order, data);
        return;
      }
      setIsCreating(false);
      setOrders((prev) => [order, ...prev]);
      toast.push({ title: 'Order confirmed', description: 'We are finding a driver for you.', variant: 'success' });
    } catch (error: any) {
      toast.push({ title: 'Could not create order', description: error.error || 'Please check your details.', variant: 'error' });
    }
  };

  const hasOrderHistory = useMemo(
    () => orders.some((order) => HISTORY_STATUSES.includes(order.status)),
    [orders]
  );

  const historyOrders = useMemo(
    () => orders.filter((order) => HISTORY_STATUSES.includes(order.status)),
    [orders]
  );

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'all') return historyOrders;
    return historyOrders.filter((order) => order.status === statusFilter);
  }, [historyOrders, statusFilter]);

  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => !(notification.is_read === true || notification.is_read === 1)),
    [notifications]
  );

  const defaultAddress = addresses.find((addr) => addr.is_default === 1);

  useEffect(() => {
    if (!hasOrderHistory && activeTab === 'history') {
      setActiveTab('home');
    }
  }, [hasOrderHistory, activeTab]);

  const savePreferences = async () => {
    try {
      await apiFetch('/api/notifications/preferences', {
        method: 'PUT',
        body: JSON.stringify(prefs),
      });
      toast.push({ title: 'Preferences saved', variant: 'success' });
    } catch (error: any) {
      toast.push({ title: 'Unable to save preferences', description: error.error || '', variant: 'error' });
    }
  };

  const submitChapaHostedCheckout = (order: any, data: any) => {
    const chapaPublicKey = (import.meta as any).env?.VITE_CHAPA_PUBLIC_KEY || 'CHAPUBK_TEST-N9ASXvlHv61Nh4ZuLTi5UtcQY7KwZmQk';
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const email = String(user.email || '').trim();
    if (!email) {
      throw new Error('Missing customer email for Chapa checkout.');
    }

    const displayName = String(user.name || 'ZED Customer').trim();
    const nameParts = displayName.split(/\s+/);
    const firstName = nameParts.shift() || 'ZED';
    const lastName = nameParts.length > 0 ? nameParts.join(' ') : 'Customer';
    const txRef = String(order.payment_reference || order.tracking_code || `zed-${order.id}`);
    const checkoutUrl = 'https://api.chapa.co/v1/hosted/pay';
    const callbackUrl = `${window.location.origin}/api/payments/chapa/callback`;
    const returnUrl = `${window.location.origin}/orders/${order.id}?payment=success&tx_ref=${encodeURIComponent(txRef)}`;

    const fields: Record<string, string> = {
      public_key: chapaPublicKey,
      tx_ref: txRef,
      amount: Number(order.total || data.pricing?.total || 0).toFixed(2),
      currency: 'ETB',
      email,
      first_name: firstName,
      last_name: lastName,
      title: `Delivery payment for ${order.tracking_code || order.id}`,
      description: `${data.pickup} → ${data.dropoff}`,
      callback_url: callbackUrl,
      return_url: returnUrl,
      'meta[order_id]': String(order.id),
      'meta[tracking_code]': String(order.tracking_code || order.id),
    };

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = checkoutUrl;
    form.style.display = 'none';

    Object.entries(fields).forEach(([name, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#2A1B7A]">Customer Dashboard</h1>
          <p className="text-gray-500">Manage deliveries, notifications, and saved addresses.</p>
        </div>
        <Button onClick={() => setIsCreating(!isCreating)} className="bg-[#F28C3A] hover:bg-[#F28C3A]/90 rounded-xl h-12 px-6">
          {isCreating ? 'Cancel Request' : 'New Delivery Request'}
        </Button>
      </div>

      <div className="flex gap-4 border-b border-gray-200 overflow-x-auto pb-2">
        <button onClick={() => setActiveTab('home')} className={`pb-2 font-medium whitespace-nowrap ${activeTab === 'home' ? 'text-[#2A1B7A] border-b-2 border-[#2A1B7A]' : 'text-gray-500 hover:text-gray-700'}`}>Home</button>
        {hasOrderHistory && (
          <button onClick={() => setActiveTab('history')} className={`pb-2 font-medium whitespace-nowrap ${activeTab === 'history' ? 'text-[#2A1B7A] border-b-2 border-[#2A1B7A]' : 'text-gray-500 hover:text-gray-700'}`}>Order History</button>
        )}
        <button onClick={() => setActiveTab('addresses')} className={`pb-2 font-medium whitespace-nowrap ${activeTab === 'addresses' ? 'text-[#2A1B7A] border-b-2 border-[#2A1B7A]' : 'text-gray-500 hover:text-gray-700'}`}>Saved Addresses</button>
        <button onClick={() => setActiveTab('preferences')} className={`pb-2 font-medium whitespace-nowrap ${activeTab === 'preferences' ? 'text-[#2A1B7A] border-b-2 border-[#2A1B7A]' : 'text-gray-500 hover:text-gray-700'}`}>Preferences</button>
      </div>

      {isCreating && (
        <div className="mb-8">
          <ParcelCalculator onConfirm={handleCreate} />
        </div>
      )}

      {activeTab === 'home' && !isCreating && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-2">
              <div className="flex items-center gap-3">
                <Package className="h-6 w-6 text-[#F28C3A]" />
                <span className="font-semibold text-[#2A1B7A]">Active Orders</span>
              </div>
              <p className="text-2xl font-bold text-gray-800">{orders.filter((o) => !['completed', 'cancelled'].includes(o.status)).length}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-2">
              <div className="flex items-center gap-3">
                <MapPin className="h-6 w-6 text-[#F28C3A]" />
                <span className="font-semibold text-[#2A1B7A]">Saved Addresses</span>
              </div>
              <p className="text-2xl font-bold text-gray-800">{addresses.length}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-2">
              <div className="flex items-center gap-3">
                <Bell className="h-6 w-6 text-[#F28C3A]" />
                <span className="font-semibold text-[#2A1B7A]">Unread Alerts</span>
              </div>
              <p className="text-2xl font-bold text-gray-800">{unreadNotifications.length}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
              <h3 className="text-xl font-bold text-[#2A1B7A]">Default Address</h3>
              {defaultAddress ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="h-4 w-4" /> {defaultAddress.label}
                  </div>
                  <p className="text-sm text-gray-500">{defaultAddress.address}</p>
                  <button onClick={() => setActiveTab('addresses')} className="text-[#F28C3A] font-medium">
                    Manage addresses
                  </button>
                </div>
              ) : (
                <p className="text-gray-500">No saved addresses.</p>
              )}
            </div>
          </div>

          {hasOrderHistory && (
            <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-[#2A1B7A]">Recent Orders</h3>
              <button onClick={() => setActiveTab('history')} className="text-[#F28C3A] font-medium hover:underline">
                View All
              </button>
            </div>
            {loading ? (
              <div className="bg-white p-8 rounded-3xl text-center border border-gray-100 shadow-sm animate-pulse h-32" />
            ) : orders.length === 0 ? (
              <div className="bg-white p-8 rounded-3xl text-center border border-gray-100 shadow-sm">
                <p className="text-gray-500">No recent orders.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {orders.slice(0, 2).map((order) => (
                  <div key={order.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-[#2A1B7A]">{order.package_type || 'Parcel'} • {order.package_size}</p>
                      <p className="text-sm text-gray-500">{formatShortDate(order.created_at)}</p>
                      {order.eta_text && <p className="text-xs text-gray-400">ETA {order.eta_text}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${STATUS_COLORS[order.status] || STATUS_COLORS.draft}`}>
                        {order.status.replace('_', ' ')}
                      </span>
                      <Button onClick={() => navigate(`/orders/${order.id}`)} className="bg-[#2A1B7A] hover:bg-[#2A1B7A]/90 text-white rounded-xl px-3 py-1 text-xs h-auto">
                        Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && hasOrderHistory && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <h2 className="text-xl font-bold text-[#2A1B7A]">Order History</h2>
            <select
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="driver_assigned">Driver Assigned</option>
              <option value="picked_up">Picked Up</option>
              <option value="in_transit">In Transit</option>
              <option value="delivered">Delivered</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading deliveries...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl text-center border border-gray-100 shadow-sm">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700">No orders found</h3>
              <p className="text-gray-500 mt-2">Create your first delivery request to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredOrders.map((order) => (
                <div key={order.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${STATUS_COLORS[order.status] || STATUS_COLORS.draft}`}>
                      {order.status.replace('_', ' ')}
                    </span>
                    <span className="text-sm text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatShortDate(order.created_at)}
                    </span>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div>
                      <h4 className="font-bold text-[#2A1B7A] text-lg">{order.package_type || 'Parcel'} • {order.package_size}</h4>
                      <p className="text-sm text-gray-500">{order.pickup_address} → {order.dropoff_address}</p>
                      {order.eta_text && <p className="text-xs text-gray-400 mt-1">ETA {order.eta_text}</p>}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <Phone className="h-4 w-4" /> {order.dropoff_contact_phone || 'Contact pending'}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <DollarSign className="h-4 w-4" /> {formatCurrency(order.total || 0)}
                    </div>
                  </div>
                  <div className="pt-4 flex gap-2">
                    <Button onClick={() => navigate(`/orders/${order.id}`)} className="bg-[#2A1B7A] hover:bg-[#2A1B7A]/90 text-white h-9 px-4">
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'addresses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#2A1B7A]">Saved Addresses</h2>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-3">
            <h3 className="font-semibold text-[#2A1B7A]">Add new address</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                value={newAddress.label}
                onChange={(e) => setNewAddress((prev) => ({ ...prev, label: e.target.value }))}
                placeholder="Label (Home, Office)"
                className="rounded-xl border border-gray-300 px-3 py-2"
              />
              <input
                value={newAddress.address}
                onChange={(e) => setNewAddress((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Address"
                className="rounded-xl border border-gray-300 px-3 py-2 md:col-span-2"
              />
            </div>
            <Button
              className="bg-[#F28C3A] hover:bg-[#F28C3A]/90 rounded-xl h-10"
              onClick={async () => {
                if (!newAddress.label || !newAddress.address) return;
                await apiFetch('/api/addresses', { method: 'POST', body: JSON.stringify(newAddress) });
                setNewAddress({ label: '', address: '' });
                fetchAll();
              }}
            >
              Save Address
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {addresses.map((address) => (
              <div key={address.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-[#2A1B7A]">{address.label}</h4>
                  {address.is_default ? (
                    <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">Default</span>
                  ) : null}
                </div>
                <p className="text-sm text-gray-500">{address.address}</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="h-9"
                    onClick={async () => {
                      await apiFetch(`/api/addresses/${address.id}/default`, { method: 'POST' });
                      fetchAll();
                    }}
                  >
                    Set Default
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9"
                    onClick={async () => {
                      await apiFetch(`/api/addresses/${address.id}`, { method: 'DELETE' });
                      fetchAll();
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
            {addresses.length === 0 && (
              <div className="bg-white p-12 rounded-3xl text-center border border-gray-100 shadow-sm">
                <MapPin className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700">No saved addresses</h3>
                <p className="text-gray-500 mt-2">Add locations to speed up delivery requests.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'preferences' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-6">
            <h3 className="text-xl font-bold text-[#2A1B7A]">Notification Preferences</h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between text-sm text-gray-600">
                In-app notifications
                <input
                  type="checkbox"
                  className="h-5 w-5 text-[#F28C3A]"
                  checked={prefs.inapp}
                  onChange={(e) => setPrefs({ ...prefs, inapp: e.target.checked })}
                />
              </label>
              <label className="flex items-center justify-between text-sm text-gray-600">
                SMS notifications
                <input
                  type="checkbox"
                  className="h-5 w-5 text-[#F28C3A]"
                  checked={prefs.sms}
                  onChange={(e) => setPrefs({ ...prefs, sms: e.target.checked })}
                />
              </label>
              <label className="flex items-center justify-between text-sm text-gray-600">
                Email notifications
                <input
                  type="checkbox"
                  className="h-5 w-5 text-[#F28C3A]"
                  checked={prefs.email}
                  onChange={(e) => setPrefs({ ...prefs, email: e.target.checked })}
                />
              </label>
            </div>
            <Button onClick={savePreferences} className="bg-[#2A1B7A] hover:bg-[#2A1B7A]/90">Save Preferences</Button>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
            <h3 className="text-xl font-bold text-[#2A1B7A]">Recent Notifications</h3>
            <div className="space-y-3">
              {notifications.slice(0, 6).map((n) => (
                <div key={n.id} className="p-3 rounded-xl border border-gray-100 bg-gray-50">
                  <p className="text-sm font-medium text-gray-800">{n.title}</p>
                  <p className="text-xs text-gray-500">{n.body}</p>
                </div>
              ))}
              {notifications.length === 0 && <p className="text-sm text-gray-400">No notifications yet.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
