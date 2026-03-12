import { useEffect, useMemo, useState } from 'react';
import { Button } from '../components/ui/Button';
import { Package, MapPin, Phone, Truck, CheckCircle, Clock, DollarSign, Star, ToggleLeft, ToggleRight, Wallet, Award, Gift, AlertTriangle } from 'lucide-react';
import { formatShortDate, formatCurrency, apiFetch } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/ui/Toast';
import { getSocket } from '../lib/socket';

export default function DriverDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'earnings' | 'application' | 'wallet' | 'loyalty' | 'settings'>('dashboard');
  const [isAvailable, setIsAvailable] = useState(false);
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [otpInput, setOtpInput] = useState('');
  const [wallet, setWallet] = useState<any>({ balance: 0 });
  const [walletTx, setWalletTx] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any>({ points: 0 });
  const [rewardTx, setRewardTx] = useState<any[]>([]);
  const [capacity, setCapacity] = useState({ maxActiveDeliveries: 2, maxWeight: 25, maxSize: 'large', breakMode: false });
  const [application, setApplication] = useState({ phone: '', vehicleType: '', idDoc: '', licenseDoc: '' });
  const [appSubmitting, setAppSubmitting] = useState(false);
  const [appError, setAppError] = useState('');
  const toast = useToast();
  const navigate = useNavigate();

  const fetchAll = async () => {
    try {
      const [driver, orderData, offerData, walletData, rewardsData] = await Promise.all([
        apiFetch('/api/drivers/me'),
        apiFetch('/api/orders'),
        apiFetch('/api/dispatch/offers'),
        apiFetch('/api/wallet'),
        apiFetch('/api/rewards'),
      ]);
      setDriverProfile(driver);
      setIsAvailable(driver?.is_online === 1);
      setCapacity({
        maxActiveDeliveries: driver?.max_active_deliveries || 2,
        maxWeight: driver?.max_weight || 25,
        maxSize: driver?.max_size || 'large',
        breakMode: driver?.break_mode === 1,
      });
      setOrders(orderData);
      setOffers(offerData);
      setWallet(walletData.wallet || { balance: 0 });
      setWalletTx(walletData.transactions || []);
      setRewards(rewardsData.rewards || { points: 0 });
      setRewardTx(rewardsData.transactions || []);
    } catch (error) {
      toast.push({ title: 'Unable to load driver data', variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const socket = getSocket();
    socket.on('order_updated', (order: any) => {
      setOrders((prev) => {
        const exists = prev.find((item) => item.id === order.id);
        if (exists) return prev.map((item) => (item.id === order.id ? order : item));
        return [order, ...prev];
      });
    });
    socket.on('dispatch_offer', () => {
      apiFetch('/api/dispatch/offers').then(setOffers);
    });
    return () => {
      socket.off('order_updated');
      socket.off('dispatch_offer');
    };
  }, []);

  useEffect(() => {
    if (!isAvailable) return;
    let interval: number | undefined;
    const updateLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          apiFetch('/api/drivers/me/location', {
            method: 'POST',
            body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          });
        });
      } else {
        apiFetch('/api/drivers/me/location', {
          method: 'POST',
          body: JSON.stringify({ lat: 8.98 + Math.random() * 0.02, lng: 38.75 + Math.random() * 0.02 }),
        });
      }
    };
    updateLocation();
    interval = window.setInterval(updateLocation, 15000);
    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [isAvailable]);

  const toggleAvailability = async () => {
    const next = !isAvailable;
    setIsAvailable(next);
    await apiFetch('/api/drivers/me/availability', { method: 'PUT', body: JSON.stringify({ isOnline: next }) });
    toast.push({ title: next ? 'You are online' : 'You are offline', variant: 'info' });
  };

  const activeOrder = orders.find((order) => order.driver_id === driverProfile?.user_id && ['driver_assigned', 'picked_up', 'in_transit'].includes(order.status));
  const completedOrders = orders.filter((order) => order.driver_id === driverProfile?.user_id && order.status === 'completed');

  const acceptOffer = async (offerId: number) => {
    try {
      await apiFetch(`/api/dispatch/offers/${offerId}/accept`, { method: 'POST' });
      toast.push({ title: 'Delivery accepted', variant: 'success' });
      fetchAll();
    } catch (error: any) {
      toast.push({ title: 'Unable to accept offer', description: error.error || '', variant: 'error' });
    }
  };

  const declineOffer = async (offerId: number) => {
    await apiFetch(`/api/dispatch/offers/${offerId}/decline`, { method: 'POST' });
    toast.push({ title: 'Offer declined' });
    fetchAll();
  };

  const updateStatus = async (id: number, status: string, note?: string, otp?: string) => {
    try {
      await apiFetch(`/api/orders/${id}/status`, { method: 'POST', body: JSON.stringify({ status, note, otp }) });
      fetchAll();
    } catch (error: any) {
      toast.push({ title: 'Status update failed', description: error.error || '', variant: 'error' });
    }
  };

  const sendNote = async (id: number, note: string) => {
    await apiFetch(`/api/orders/${id}/event`, { method: 'POST', body: JSON.stringify({ note, eventType: 'arrived' }) });
    toast.push({ title: 'Customer notified', description: note });
  };

  const saveCapacity = async () => {
    try {
      await apiFetch('/api/drivers/me', {
        method: 'PUT',
        body: JSON.stringify({
          maxActiveDeliveries: capacity.maxActiveDeliveries,
          maxWeight: capacity.maxWeight,
          maxSize: capacity.maxSize,
          breakMode: capacity.breakMode,
        }),
      });
      toast.push({ title: 'Driver settings saved', variant: 'success' });
      fetchAll();
    } catch (error: any) {
      toast.push({ title: 'Unable to save settings', description: error.error || '', variant: 'error' });
    }
  };

  const submitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setAppError('');
    setAppSubmitting(true);
    try {
      await apiFetch('/api/drivers/apply', {
        method: 'POST',
        body: JSON.stringify({
          phone: application.phone,
          vehicleType: application.vehicleType,
          idDoc: application.idDoc,
          licenseDoc: application.licenseDoc,
        }),
      });
      toast.push({ title: 'Application submitted', variant: 'success' });
        setDriverProfile((prev: any) => ({
          ...(prev || {}),
          status: 'pending',
          phone: application.phone,
          vehicle_type: application.vehicleType,
          id_doc: application.idDoc,
          license_doc: application.licenseDoc,
        }));
    } catch (error: any) {
      setAppError(error.error || 'Unable to submit application');
    } finally {
      setAppSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading driver dashboard...</div>;
  }

  if (!driverProfile) {
    return (
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-[#2A1B7A]">Driver Application</h1>
          <p className="text-gray-500">Submit your driver profile to start receiving delivery offers.</p>
        </div>
        <form onSubmit={submitApplication} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
          {appError && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100">{appError}</div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 ml-1">Phone Number</label>
              <input
                required
                value={application.phone}
                onChange={(e) => setApplication({ ...application, phone: e.target.value })}
                placeholder="+251 911 234567"
                className="h-12 w-full rounded-xl border border-gray-300 px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F28C3A]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 ml-1">Vehicle Type</label>
              <select
                required
                value={application.vehicleType}
                onChange={(e) => setApplication({ ...application, vehicleType: e.target.value })}
                className="h-12 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F28C3A]"
              >
                <option value="">Select Vehicle</option>
                <option value="motorcycle">Motorcycle</option>
                <option value="car">Car</option>
                <option value="van">Van / Truck</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 ml-1">ID Document (ref)</label>
              <input
                value={application.idDoc}
                onChange={(e) => setApplication({ ...application, idDoc: e.target.value })}
                placeholder="ID/Passport reference"
                className="h-12 w-full rounded-xl border border-gray-300 px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F28C3A]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 ml-1">Driver License (ref)</label>
              <input
                value={application.licenseDoc}
                onChange={(e) => setApplication({ ...application, licenseDoc: e.target.value })}
                placeholder="License reference"
                className="h-12 w-full rounded-xl border border-gray-300 px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F28C3A]"
              />
            </div>
          </div>
          <Button type="submit" className="h-12" disabled={appSubmitting}>
            {appSubmitting ? 'Submitting...' : 'Submit Application'}
          </Button>
        </form>
      </div>
    );
  }

  if (driverProfile?.status === 'pending') {
    return (
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-[#2A1B7A]">Driver Application</h1>
          <p className="text-gray-500">Complete your profile to start earning with Zemen Express</p>
        </div>
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-[#2A1B7A]">Application submitted</h3>
            <p className="text-sm text-gray-500">Our team is reviewing your documents. You will be notified once approved.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#2A1B7A]">Driver Dashboard</h1>
          <p className="text-gray-500">Manage active deliveries and availability</p>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
          <span className={`font-bold ${isAvailable ? 'text-green-600' : 'text-gray-400'}`}>
            {isAvailable ? 'Online' : 'Offline'}
          </span>
          <button onClick={toggleAvailability}>
            {isAvailable ? <ToggleRight className="h-8 w-8 text-green-600" /> : <ToggleLeft className="h-8 w-8 text-gray-400" />}
          </button>
        </div>
      </div>

      <div className="flex gap-4 border-b border-gray-200 overflow-x-auto pb-2">
        <button onClick={() => setActiveTab('dashboard')} className={`pb-2 font-medium whitespace-nowrap ${activeTab === 'dashboard' ? 'text-[#2A1B7A] border-b-2 border-[#2A1B7A]' : 'text-gray-500 hover:text-gray-700'}`}>Active Deliveries</button>
        <button onClick={() => setActiveTab('earnings')} className={`pb-2 font-medium whitespace-nowrap ${activeTab === 'earnings' ? 'text-[#2A1B7A] border-b-2 border-[#2A1B7A]' : 'text-gray-500 hover:text-gray-700'}`}>Earnings & History</button>
        <button onClick={() => setActiveTab('wallet')} className={`pb-2 font-medium whitespace-nowrap ${activeTab === 'wallet' ? 'text-[#2A1B7A] border-b-2 border-[#2A1B7A]' : 'text-gray-500 hover:text-gray-700'}`}>Wallet</button>
        <button onClick={() => setActiveTab('loyalty')} className={`pb-2 font-medium whitespace-nowrap ${activeTab === 'loyalty' ? 'text-[#2A1B7A] border-b-2 border-[#2A1B7A]' : 'text-gray-500 hover:text-gray-700'}`}>Rewards</button>
        <button onClick={() => setActiveTab('settings')} className={`pb-2 font-medium whitespace-nowrap ${activeTab === 'settings' ? 'text-[#2A1B7A] border-b-2 border-[#2A1B7A]' : 'text-gray-500 hover:text-gray-700'}`}>Settings</button>
      </div>

      {activeTab === 'dashboard' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="bg-green-50 p-4 rounded-xl">
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Completed Deliveries</p>
                <p className="text-2xl font-bold text-gray-800">{completedOrders.length}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="bg-blue-50 p-4 rounded-xl">
                <CheckCircle className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Active Jobs</p>
                <p className="text-2xl font-bold text-gray-800">{activeOrder ? 1 : 0}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="bg-yellow-50 p-4 rounded-xl">
                <Star className="h-8 w-8 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Acceptance Rate</p>
                <p className="text-2xl font-bold text-gray-800">{Math.round((driverProfile?.accept_rate || 1) * 100)}%</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-[#2A1B7A] flex items-center gap-2">
                <Truck className="h-6 w-6 text-[#F28C3A]" /> Active Delivery
              </h2>
              {!activeOrder ? (
                <div className="bg-white p-8 rounded-3xl text-center border border-gray-100 shadow-sm">
                  <p className="text-gray-500">You have no active deliveries.</p>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-600">{activeOrder.status.replace('_', ' ')}</span>
                    <span className="text-sm text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatShortDate(activeOrder.created_at)}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-[#2A1B7A] text-lg">{activeOrder.package_type || 'Parcel'} • {activeOrder.package_size}</h4>
                    <p className="text-sm text-gray-500">{activeOrder.pickup_address} → {activeOrder.dropoff_address}</p>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <Phone className="h-4 w-4" /> {activeOrder.dropoff_contact_phone || 'Contact pending'}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => navigate(`/orders/${activeOrder.id}`)} variant="outline">View Details</Button>
                    {activeOrder.status === 'driver_assigned' && (
                      <>
                        <Button onClick={() => sendNote(activeOrder.id, 'Arrived at pickup location')} className="bg-white border border-gray-200 text-gray-700">Arrived at Pickup</Button>
                        <Button onClick={() => updateStatus(activeOrder.id, 'picked_up')} className="bg-[#2A1B7A] hover:bg-[#2A1B7A]/90 text-white">Picked Up</Button>
                      </>
                    )}
                    {activeOrder.status === 'picked_up' && (
                      <Button onClick={() => updateStatus(activeOrder.id, 'in_transit')} className="bg-[#2A1B7A] hover:bg-[#2A1B7A]/90 text-white">Start Delivery</Button>
                    )}
                    {activeOrder.status === 'in_transit' && (
                      <div className="flex flex-col sm:flex-row gap-2 items-start">
                        <input
                          value={otpInput}
                          onChange={(e) => setOtpInput(e.target.value)}
                          placeholder="Enter OTP"
                          className="h-10 rounded-xl border border-gray-300 px-3"
                        />
                        <Button onClick={() => updateStatus(activeOrder.id, 'delivered', 'Delivered', otpInput)} className="bg-[#F28C3A] hover:bg-[#F28C3A]/90 text-white">Confirm Delivery</Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-bold text-[#2A1B7A] flex items-center gap-2">
                <Package className="h-6 w-6 text-[#F28C3A]" /> Nearby Requests
              </h2>
              {offers.length === 0 ? (
                <div className="bg-white p-8 rounded-3xl text-center border border-gray-100 shadow-sm">
                  <p className="text-gray-500">No nearby requests right now.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {offers.map((offer) => (
                    <div key={offer.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-[#2A1B7A]">Order #{offer.order_id}</p>
                        <span className="text-xs text-gray-400">Offer expires soon</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <AlertTriangle className="h-4 w-4" /> Respond within 60 seconds.
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => acceptOffer(offer.id)} className="bg-[#2A1B7A] hover:bg-[#2A1B7A]/90 text-white">Accept</Button>
                        <Button onClick={() => declineOffer(offer.id)} variant="outline">Decline</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'earnings' && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-[#2A1B7A]">Earnings & History</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {completedOrders.map((order) => (
              <div key={order.id} className="p-6 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-[#2A1B7A]">Order #{order.id}</p>
                  <p className="text-sm text-gray-500">{formatShortDate(order.created_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-[#F28C3A] font-semibold">{formatCurrency(order.total || 0)}</div>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/orders/${order.id}`)}>View</Button>
                </div>
              </div>
            ))}
            {completedOrders.length === 0 && (
              <div className="p-8 text-center text-gray-500">No completed deliveries yet.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'wallet' && (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
          <h3 className="text-xl font-bold text-[#2A1B7A] flex items-center gap-2">
            <Wallet className="h-6 w-6 text-[#F28C3A]" /> Driver Wallet
          </h3>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(wallet.balance || 0)}</p>
          <div className="space-y-2 text-sm text-gray-600">
            {walletTx.slice(0, 4).map((tx) => (
              <div key={tx.id} className="flex justify-between">
                <span>{tx.type === 'credit' ? 'Payout' : 'Withdrawal'}</span>
                <span className={tx.type === 'credit' ? 'text-green-600' : 'text-red-500'}>
                  {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                </span>
              </div>
            ))}
            {walletTx.length === 0 && <p className="text-sm text-gray-400">No transactions yet.</p>}
          </div>
        </div>
      )}

      {activeTab === 'loyalty' && (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
          <h3 className="text-xl font-bold text-[#2A1B7A] flex items-center gap-2">
            <Award className="h-6 w-6 text-[#F28C3A]" /> Driver Rewards
          </h3>
          <p className="text-3xl font-bold text-gray-900">{rewards.points || 0} points</p>
          <div className="space-y-2 text-sm text-gray-600">
            {rewardTx.slice(0, 4).map((tx) => (
              <div key={tx.id} className="flex justify-between">
                <span>{tx.description || 'Reward activity'}</span>
                <span className={tx.type === 'earn' ? 'text-green-600' : 'text-red-500'}>
                  {tx.type === 'earn' ? '+' : '-'}{tx.points}
                </span>
              </div>
            ))}
            {rewardTx.length === 0 && <p className="text-sm text-gray-400">No rewards activity yet.</p>}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-6">
          <h3 className="text-xl font-bold text-[#2A1B7A]">Availability & Capacity</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Max Active Deliveries</label>
              <input
                type="number"
                min="1"
                value={capacity.maxActiveDeliveries}
                onChange={(e) => setCapacity({ ...capacity, maxActiveDeliveries: Number(e.target.value) })}
                className="h-11 w-full rounded-xl border border-gray-300 px-3"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Max Weight (kg)</label>
              <input
                type="number"
                min="1"
                value={capacity.maxWeight}
                onChange={(e) => setCapacity({ ...capacity, maxWeight: Number(e.target.value) })}
                className="h-11 w-full rounded-xl border border-gray-300 px-3"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Max Package Size</label>
              <select
                value={capacity.maxSize}
                onChange={(e) => setCapacity({ ...capacity, maxSize: e.target.value })}
                className="h-11 w-full rounded-xl border border-gray-300 px-3 bg-white"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
                <option value="xlarge">Extra Large</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Break Mode</label>
              <button
                type="button"
                onClick={() => setCapacity({ ...capacity, breakMode: !capacity.breakMode })}
                className={`w-full h-11 rounded-xl border ${capacity.breakMode ? 'border-red-200 bg-red-50 text-red-600' : 'border-gray-200 text-gray-600'}`}
              >
                {capacity.breakMode ? 'On Break' : 'Available'}
              </button>
            </div>
          </div>
          <Button onClick={saveCapacity} className="bg-[#2A1B7A] hover:bg-[#2A1B7A]/90">Save Settings</Button>
        </div>
      )}
    </div>
  );
}
