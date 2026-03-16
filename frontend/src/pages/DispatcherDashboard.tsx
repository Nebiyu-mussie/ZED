import { useEffect, useMemo, useState } from 'react';
import { Package, Truck, Users, CheckCircle, XCircle } from 'lucide-react';
import { apiFetch, formatCurrency } from '../lib/api';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { useNavigate } from 'react-router-dom';

const ORDER_STATUS_BADGES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  confirmed: 'bg-yellow-100 text-yellow-800',
  driver_assigned: 'bg-blue-100 text-blue-800',
  picked_up: 'bg-indigo-100 text-indigo-800',
  in_transit: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  completed: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-100 text-red-800',
  returned: 'bg-orange-100 text-orange-800',
  failed: 'bg-red-100 text-red-800',
};

const statusBadge = (status?: string) => ORDER_STATUS_BADGES[status || ''] || 'bg-gray-100 text-gray-700';

export default function DispatcherDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'assignments' | 'drivers'>('overview');
  const toast = useToast();
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [ordersRes, driversRes] = await Promise.all([
        apiFetch('/api/orders'),
        apiFetch('/api/drivers'),
      ]);
      setOrders(ordersRes || []);
      setDrivers(driversRes || []);
    } catch (error: any) {
      toast.push({ title: 'Unable to load dispatcher data', description: error.error || '', variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const unassigned = useMemo(() => orders.filter((o) => !o.driver_id && o.status === 'confirmed'), [orders]);
  const active = useMemo(() => orders.filter((o) => ['driver_assigned', 'picked_up', 'in_transit'].includes(o.status)), [orders]);
  const onlineDrivers = useMemo(() => drivers.filter((d) => d.is_online), [drivers]);

  const assignDriver = async (orderId: string, driverId: string) => {
    try {
      await apiFetch(`/api/orders/${orderId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ driverId }),
      });
      toast.push({ title: 'Driver assigned', variant: 'success' });
      fetchData();
    } catch (error: any) {
      toast.push({ title: 'Assignment failed', description: error.error || '', variant: 'error' });
    }
  };

  const markStatus = async (orderId: number, status: string) => {
    try {
      await apiFetch(`/api/orders/${orderId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      });
      toast.push({ title: `Order ${status.replace('_', ' ')}`, variant: 'success' });
      fetchData();
    } catch (error: any) {
      toast.push({ title: 'Status update failed', description: error.error || '', variant: 'error' });
    }
  };

  const cancelOrder = async (orderId: number) => {
    try {
      await apiFetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Cancelled by dispatcher' }),
      });
      toast.push({ title: 'Order cancelled', variant: 'success' });
      fetchData();
    } catch (error: any) {
      toast.push({ title: 'Cancel failed', description: error.error || '', variant: 'error' });
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading dispatcher dashboard...</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#2A1B7A]">Dispatcher Dashboard</h1>
          <p className="text-gray-500">Assign drivers and manage active deliveries.</p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-gray-200 overflow-x-auto pb-2">
        {['overview', 'assignments', 'drivers'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as typeof activeTab)}
            className={`pb-2 font-medium whitespace-nowrap ${activeTab === tab ? 'text-[#2A1B7A] border-b-2 border-[#2A1B7A]' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="bg-orange-100 p-4 rounded-2xl text-[#F28C3A]">
              <Package className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Unassigned Orders</p>
              <p className="text-2xl font-bold text-[#2A1B7A]">{unassigned.length}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="bg-blue-100 p-4 rounded-2xl text-blue-600">
              <Truck className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Active Deliveries</p>
              <p className="text-2xl font-bold text-[#2A1B7A]">{active.length}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="bg-green-100 p-4 rounded-2xl text-green-600">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Drivers Online</p>
              <p className="text-2xl font-bold text-[#2A1B7A]">{onlineDrivers.length}</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'assignments' && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-xl font-bold text-[#2A1B7A]">Assign Drivers</h2>
            <Button variant="outline" size="sm" onClick={fetchData}>Refresh</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider">
                  <th className="p-4 font-medium">Order</th>
                  <th className="p-4 font-medium">Route</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Value</th>
                  <th className="p-4 font-medium">Assign</th>
                  <th className="p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 text-sm font-medium text-gray-900">#{order.id.toString().padStart(5, '0')}</td>
                    <td className="p-4 text-sm text-gray-600 max-w-xs truncate">{order.pickup_address} → {order.dropoff_address}</td>
                    <td className="p-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold uppercase ${statusBadge(order.status)}`}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-sm font-bold text-[#F28C3A]">{formatCurrency(order.total || 0)}</td>
                    <td className="p-4">
                      <select
                        className="rounded-xl border border-gray-200 px-2 py-1 text-xs"
                        onChange={(e) => assignDriver(order.id, e.target.value)}
                        value={order.driver_id || ''}
                      >
                        <option value="">Assign</option>
                        {drivers.filter((d) => d.status === 'approved').map((driver) => (
                          <option key={driver.user_id} value={driver.user_id}>
                            {driver.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => navigate(`/orders/${order.id}`)}>View</Button>
                        <Button variant="outline" size="sm" onClick={() => markStatus(order.id, 'returned')}>Returned</Button>
                        <Button variant="outline" size="sm" onClick={() => markStatus(order.id, 'failed')}>Failed</Button>
                        <Button size="sm" className="bg-[#F28C3A] hover:bg-[#F28C3A]/90 text-white" onClick={() => cancelOrder(order.id)}>Cancel</Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">No orders found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'drivers' && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-xl font-bold text-[#2A1B7A]">Driver Availability</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {drivers.map((driver) => (
              <div key={driver.id} className="p-6 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-gray-900">{driver.name || 'Driver'}</div>
                  <div className="text-xs text-gray-500">{driver.email || '—'} • {driver.phone || '—'}</div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {driver.status === 'approved' ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span className="text-gray-600">{driver.is_online ? 'Online' : 'Offline'}</span>
                </div>
              </div>
            ))}
            {drivers.length === 0 && <div className="p-8 text-center text-gray-500">No drivers found.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
