import React, { useEffect, useMemo, useState } from 'react';
import { Package, MapPin, Phone, DollarSign, Clock, CheckCircle, Store, ChevronRight, Wallet, Award, Gift } from 'lucide-react';
import { formatShortDate, formatCurrency, apiFetch } from '../lib/api';
import { Link, useNavigate } from 'react-router-dom';
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

export default function CustomerDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [wallet, setWallet] = useState<any>({ balance: 0 });
  const [rewards, setRewards] = useState<any>({ points: 0 });
  const [walletTx, setWalletTx] = useState<any[]>([]);
  const [rewardTx, setRewardTx] = useState<any[]>([]);
  const [topupAmount, setTopupAmount] = useState('200');
  const [prefs, setPrefs] = useState({ inapp: true, sms: true, email: true });
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'addresses' | 'preferences' | 'wallet' | 'loyalty'>('home');
  const [statusFilter, setStatusFilter] = useState('all');
  const [newAddress, setNewAddress] = useState({ label: '', address: '' });
  const navigate = useNavigate();
  const toast = useToast();

  const fetchAll = async () => {
    try {
      const [ordersData, addressData, walletData, rewardsData] = await Promise.all([
        apiFetch('/api/orders'),
        apiFetch('/api/addresses'),
        apiFetch('/api/wallet'),
        apiFetch('/api/rewards'),
      ]);
      setOrders(ordersData);
      setAddresses(addressData);
      setWallet(walletData.wallet);
      setWalletTx(walletData.transactions || []);
      setRewards(rewardsData.rewards);
      setRewardTx(rewardsData.transactions || []);

      const [prefData, notifData] = await Promise.all([
        apiFetch('/api/notifications/preferences'),
        apiFetch('/api/notifications'),
      ]);
      setPrefs({
        inapp: prefData.inapp === 1 || prefData.inapp === true,
        sms: prefData.sms === 1 || prefData.sms === true,
        email: prefData.email === 1 || prefData.email === true,
      });
      setNotifications(notifData || []);
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
          insurance: data.hasInsurance,
          promoCode: data.promoCode,
          scheduleType: data.serviceType === 'scheduled' ? 'scheduled' : 'now',
          scheduledTime: data.scheduledTime || null,
          paymentMethod: data.paymentMethod || 'cash',
        }),
      });
      setIsCreating(false);
      setOrders((prev) => [order, ...prev]);
      toast.push({ title: 'Order confirmed', description: 'We are finding a driver for you.', variant: 'success' });
    } catch (error: any) {
      toast.push({ title: 'Could not create order', description: error.error || 'Please check your details.', variant: 'error' });
    }
  };

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'all') return orders;
    return orders.filter((order) => order.status === statusFilter);
  }, [orders, statusFilter]);

  const defaultAddress = addresses.find((addr) => addr.is_default === 1);

  const handleTopup = async () => {
    try {
      await apiFetch('/api/wallet/topup', {
        method: 'POST',
        body: JSON.stringify({ amount: Number(topupAmount), method: 'card' }),
      });
      toast.push({ title: 'Wallet topped up', variant: 'success' });
      fetchAll();
    } catch (error: any) {
      toast.push({ title: 'Top up failed', description: error.error || '', variant: 'error' });
    }
  };

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

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#2A1B7A]">Customer Dashboard</h1>
          <p className="text-gray-500">Manage deliveries, wallet, and saved addresses.</p>
        </div>
        <Button onClick={() => setIsCreating(!isCreating)} className="bg-[#F28C3A] hover:bg-[#F28C3A]/90 rounded-xl h-12 px-6">
          {isCreating ? 'Cancel Request' : 'New Delivery Request'}
        </Button>
      </div>

      <div className="flex gap-4 border-b border-gray-200 overflow-x-auto pb-2">
        <button onClick={() => setActiveTab('home')} className={`pb-2 font-medium whitespace-nowrap ${activeTab === 'home' ? 'text-[#2A1B7A] border-b-2 border-[#2A1B7A]' : 'text-gray-500 hover:text-gray-700'}`}>Home</button>
        <button onClick={() => setActiveTab('history')} className={`pb-2 font-medium whitespace-nowrap ${activeTab === 'history' ? 'text-[#2A1B7A] border-b-2 border-[#2A1B7A]' : 'text-gray-500 hover:text-gray-700'}`}>Order History</button>
        <button onClick={() => setActiveTab('wallet')} className={`pb-2 font-medium whitespace-nowrap ${activeTab === 'wallet' ? 'text-[#2A1B7A] border-b-2 border-[#2A1B7A]' : 'text-gray-500 hover:text-gray-700'}`}>Wallet</button>
        <button onClick={() => setActiveTab('loyalty')} className={`pb-2 font-medium whitespace-nowrap ${activeTab === 'loyalty' ? 'text-[#2A1B7A] border-b-2 border-[#2A1B7A]' : 'text-gray-500 hover:text-gray-700'}`}>Rewards</button>
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
          <div className="bg-gradient-to-r from-[#2A1B7A] to-[#F28C3A] rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Track every parcel in real time</h2>
              <p className="text-white/80">We&apos;ll notify you at every status change.</p>
            </div>
            <Button onClick={() => setIsCreating(true)} className="bg-white text-[#2A1B7A] hover:bg-gray-100 rounded-xl px-6 py-3 font-bold whitespace-nowrap">
              Create Delivery
            </Button>
          </div>

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
                <Wallet className="h-6 w-6 text-[#F28C3A]" />
                <span className="font-semibold text-[#2A1B7A]">Wallet Balance</span>
              </div>
              <p className="text-2xl font-bold text-gray-800">{formatCurrency(wallet.balance || 0)}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-2">
              <div className="flex items-center gap-3">
                <Award className="h-6 w-6 text-[#F28C3A]" />
                <span className="font-semibold text-[#2A1B7A]">Reward Points</span>
              </div>
              <p className="text-2xl font-bold text-gray-800">{rewards.points || 0}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
              <h3 className="text-xl font-bold text-[#2A1B7A]">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setIsCreating(true)} className="p-4 bg-[#F28C3A]/10 rounded-2xl flex flex-col items-center text-center gap-2 hover:bg-[#F28C3A]/20 transition-colors">
                  <Package className="h-8 w-8 text-[#F28C3A]" />
                  <span className="font-medium text-[#2A1B7A]">Send Parcel</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className="p-4 bg-[#2A1B7A]/10 rounded-2xl flex flex-col items-center text-center gap-2 hover:bg-[#2A1B7A]/20 transition-colors"
                >
                  <Store className="h-8 w-8 text-[#2A1B7A]" />
                  <span className="font-medium text-[#2A1B7A]">Order History</span>
                </button>
              </div>
            </div>

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

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-[#2A1B7A]">Recent Orders</h3>
              <button onClick={() => setActiveTab('history')} className="text-[#F28C3A] font-medium flex items-center hover:underline">
                View All <ChevronRight className="h-4 w-4" />
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
        </div>
      )}

      {activeTab === 'history' && (
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

      {activeTab === 'wallet' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
            <h3 className="text-xl font-bold text-[#2A1B7A] flex items-center gap-2">
              <Wallet className="h-6 w-6 text-[#F28C3A]" /> Digital Wallet
            </h3>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(wallet.balance || 0)}</p>
            <div className="space-y-3">
              {walletTx.slice(0, 4).map((tx) => (
                <div key={tx.id} className="flex justify-between text-sm text-gray-600">
                  <span>{tx.type === 'credit' ? 'Wallet Top Up' : 'Payment'}</span>
                  <span className={tx.type === 'credit' ? 'text-green-600' : 'text-red-500'}>
                    {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </span>
                </div>
              ))}
              {walletTx.length === 0 && <p className="text-sm text-gray-400">No transactions yet.</p>}
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
            <h3 className="text-xl font-bold text-[#2A1B7A]">Quick Wallet Actions</h3>
            <div className="flex items-center gap-3">
              <input
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
                className="h-12 rounded-xl border border-gray-300 px-3 flex-1"
                placeholder="Amount in ETB"
              />
              <Button onClick={handleTopup} className="bg-[#F28C3A] hover:bg-[#F28C3A]/90 rounded-xl h-12 px-6">Top Up</Button>
            </div>
            <p className="text-sm text-gray-500">Wallet top-ups are instant and can be used for faster checkout.</p>
          </div>
        </div>
      )}

      {activeTab === 'loyalty' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
            <h3 className="text-xl font-bold text-[#2A1B7A] flex items-center gap-2">
              <Award className="h-6 w-6 text-[#F28C3A]" /> Zemen Rewards
            </h3>
            <p className="text-3xl font-bold text-gray-900">{rewards.points || 0} points</p>
            <div className="space-y-3">
              {rewardTx.slice(0, 4).map((tx) => (
                <div key={tx.id} className="flex justify-between text-sm text-gray-600">
                  <span>{tx.description || 'Reward activity'}</span>
                  <span className={tx.type === 'earn' ? 'text-green-600' : 'text-red-500'}>
                    {tx.type === 'earn' ? '+' : '-'}{tx.points}
                  </span>
                </div>
              ))}
              {rewardTx.length === 0 && <p className="text-sm text-gray-400">No rewards activity yet.</p>}
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
            <h3 className="text-xl font-bold text-[#2A1B7A] flex items-center gap-2">
              <Gift className="w-5 h-5 text-[#F28C3A]" /> Redeem Rewards
            </h3>
            <p className="text-sm text-gray-500">Redeem points for wallet credits and delivery discounts.</p>
            <Button className="bg-[#2A1B7A] hover:bg-[#2A1B7A]/90 rounded-xl h-12">Redeem Points</Button>
          </div>
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
