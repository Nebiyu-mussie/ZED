import React, { useEffect, useMemo, useState } from 'react';
import { Users, Truck, Package, CheckCircle, XCircle, BarChart3, Map, Search, Filter, AlertTriangle } from 'lucide-react';
import { formatShortDate, formatCurrency, apiFetch } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import { getSocket } from '../lib/socket';

type TabType = 'overview' | 'orders' | 'drivers' | 'customers' | 'reports' | 'operations' | 'map';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [orders, setOrders] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<any>({});
  const [tickets, setTickets] = useState<any[]>([]);
  const [promos, setPromos] = useState<any[]>([]);
  const [pricingRules, setPricingRules] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any>({ orders: [], users: [] });
  const [promoForm, setPromoForm] = useState({ code: '', discountType: 'flat', amount: 0, minSpend: 0, maxUses: 0, perUserLimit: 0 });
  const [pricingForm, setPricingForm] = useState({ zoneName: '', serviceType: 'same_day', baseFare: 80, perKm: 12, weightRate: 6, surgeMultiplier: 1 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [ordersRes, driversRes, usersRes, reportRes, ticketsRes, promosRes, pricingRes, zonesRes, auditRes] = await Promise.all([
        apiFetch('/api/orders'),
        apiFetch('/api/drivers'),
        apiFetch('/api/users'),
        apiFetch('/api/admin/reports'),
        apiFetch('/api/admin/tickets'),
        apiFetch('/api/admin/promos'),
        apiFetch('/api/admin/pricing'),
        apiFetch('/api/admin/zones'),
        apiFetch('/api/admin/audit'),
      ]);
      setOrders(ordersRes);
      setDrivers(driversRes);
      setUsers(usersRes);
      setReports(reportRes);
      setTickets(ticketsRes || []);
      setPromos(promosRes || []);
      setPricingRules(pricingRes || []);
      setZones(zonesRes || []);
      setAuditLogs(auditRes || []);
    } catch (error) {
      toast.push({ title: 'Failed to load admin data', variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const socket = getSocket();
    socket.on('order_updated', (order: any) => {
      setOrders((prev) => {
        const exists = prev.find((item) => item.id === order.id);
        if (exists) return prev.map((item) => (item.id === order.id ? order : item));
        return [order, ...prev];
      });
    });
    socket.on('driver_location', (payload: any) => {
      setDrivers((prev) => prev.map((d) => (d.user_id === payload.driverId ? { ...d, last_lat: payload.lat, last_lng: payload.lng } : d)));
    });
    return () => {
      socket.off('order_updated');
      socket.off('driver_location');
    };
  }, []);

  const updateDriverStatus = async (id: number, status: string) => {
    try {
      await apiFetch(`/api/drivers/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      toast.push({ title: `Driver ${status}`, variant: 'success' });
      fetchData();
    } catch (error) {
      toast.push({ title: 'Could not update driver status', variant: 'error' });
    }
  };

  const assignDriver = async (orderId: number, driverId: number) => {
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

  const updateTicketStatus = async (ticketId: number, status: string) => {
    try {
      await apiFetch(`/api/admin/tickets/${ticketId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      toast.push({ title: 'Ticket updated', variant: 'success' });
      fetchData();
    } catch (error) {
      toast.push({ title: 'Unable to update ticket', variant: 'error' });
    }
  };

  const togglePromo = async (promoId: number, active: boolean) => {
    try {
      await apiFetch(`/api/admin/promos/${promoId}`, {
        method: 'PUT',
        body: JSON.stringify({ active }),
      });
      fetchData();
    } catch (error) {
      toast.push({ title: 'Unable to update promo', variant: 'error' });
    }
  };

  const createPromo = async () => {
    try {
      await apiFetch('/api/admin/promos', {
        method: 'POST',
        body: JSON.stringify(promoForm),
      });
      setPromoForm({ code: '', discountType: 'flat', amount: 0, minSpend: 0, maxUses: 0, perUserLimit: 0 });
      fetchData();
    } catch (error) {
      toast.push({ title: 'Unable to create promo', variant: 'error' });
    }
  };

  const createPricingRule = async () => {
    try {
      await apiFetch('/api/admin/pricing', {
        method: 'POST',
        body: JSON.stringify(pricingForm),
      });
      fetchData();
    } catch (error) {
      toast.push({ title: 'Unable to create pricing rule', variant: 'error' });
    }
  };

  const updateZoneStatus = async (zoneId: number, status: string) => {
    try {
      await apiFetch(`/api/admin/zones/${zoneId}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      fetchData();
    } catch (error) {
      toast.push({ title: 'Unable to update zone', variant: 'error' });
    }
  };

  const runSearch = async () => {
    if (!search) return;
    try {
      const result = await apiFetch(`/api/admin/search?q=${encodeURIComponent(search)}`);
      setSearchResults(result);
    } catch (error) {
      toast.push({ title: 'Search failed', variant: 'error' });
    }
  };

  const filteredOrders = useMemo(() => {
    if (!search) return orders;
    return orders.filter((order) => order.pickup_address?.toLowerCase().includes(search.toLowerCase()) || `${order.id}`.includes(search) || `${order.tracking_code || ''}`.toLowerCase().includes(search.toLowerCase()));
  }, [orders, search]);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading admin dashboard...</div>;

  const pendingDrivers = drivers.filter((d) => d.status === 'pending');

  const renderOverview = () => (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-blue-100 p-4 rounded-2xl text-blue-600">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Users</p>
            <p className="text-2xl font-bold text-[#2A1B7A]">{users.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-indigo-100 p-4 rounded-2xl text-indigo-600">
            <Truck className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Drivers</p>
            <p className="text-2xl font-bold text-[#2A1B7A]">{drivers.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-orange-100 p-4 rounded-2xl text-[#F28C3A]">
            <Package className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Orders</p>
            <p className="text-2xl font-bold text-[#2A1B7A]">{orders.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-green-100 p-4 rounded-2xl text-green-600">
            <BarChart3 className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Revenue</p>
            <p className="text-2xl font-bold text-[#2A1B7A]">{formatCurrency(reports.revenue || 0)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-xl font-bold text-[#2A1B7A]">Recent Orders</h2>
            <Button variant="outline" size="sm" onClick={() => setActiveTab('orders')}>View All</Button>
          </div>
          <div className="divide-y divide-gray-100">
            {orders.slice(0, 5).map(order => (
              <div key={order.id} className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-gray-900">Order #{order.id}</h4>
                  <span className="text-sm font-bold text-[#F28C3A]">{formatCurrency(order.total || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500">{order.pickup_address} → {order.dropoff_address}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase text-gray-500 bg-gray-100 px-2 py-1 rounded-md">{order.status.replace('_', ' ')}</span>
                      <Button onClick={() => navigate(`/orders/${order.id}`)} size="sm" className="bg-[#2A1B7A] hover:bg-[#2A1B7A]/90 text-white h-6 px-2 text-xs">
                        View
                      </Button>
                    </div>
                  </div>
                </div>
            ))}
            {orders.length === 0 && <div className="p-6 text-center text-gray-500">No orders found.</div>}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-xl font-bold text-[#2A1B7A]">Pending Driver Applications</h2>
            <Button variant="outline" size="sm" onClick={() => setActiveTab('drivers')}>Manage</Button>
          </div>
          <div className="divide-y divide-gray-100">
            {pendingDrivers.map(driver => (
              <div key={driver.id} className="p-6 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-gray-900">{driver.name}</h4>
                  <p className="text-sm text-gray-500">{driver.email} • {driver.phone}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => updateDriverStatus(driver.id, 'approved')} className="p-2 text-green-600 hover:bg-green-50 rounded-full">
                    <CheckCircle className="w-5 h-5" />
                  </button>
                  <button onClick={() => updateDriverStatus(driver.id, 'rejected')} className="p-2 text-red-600 hover:bg-red-50 rounded-full">
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
            {pendingDrivers.length === 0 && <div className="p-6 text-center text-gray-500">No pending applications.</div>}
          </div>
        </div>
      </div>
    </div>
  );

  const renderOrders = () => (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in duration-300">
      <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold text-[#2A1B7A]">Order Management</h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Search orders..." className="pl-9 h-10" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" className="h-10 px-3"><Filter className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider">
              <th className="p-4 font-medium">Order ID</th>
              <th className="p-4 font-medium">Customer</th>
              <th className="p-4 font-medium">Details</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Price</th>
              <th className="p-4 font-medium">Assign</th>
              <th className="p-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredOrders.map(order => (
              <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="p-4 text-sm font-medium text-gray-900">#{order.id.toString().padStart(5, '0')}</td>
                <td className="p-4 text-sm text-gray-600">Customer</td>
                <td className="p-4 text-sm text-gray-600 max-w-xs truncate">{order.pickup_address} → {order.dropoff_address}</td>
                <td className="p-4">
                  <span className="px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-gray-100 text-gray-700">
                    {order.status.replace('_', ' ')}
                  </span>
                  {order.sla_status && (
                    <span className={`ml-2 text-xs font-semibold ${order.sla_status === 'late' ? 'text-red-600' : order.sla_status === 'at_risk' ? 'text-orange-500' : 'text-green-600'}`}>
                      {order.sla_status.replace('_', ' ')}
                    </span>
                  )}
                </td>
                <td className="p-4 text-sm font-bold text-[#F28C3A]">{formatCurrency(order.total || 0)}</td>
                <td className="p-4">
                  <select
                    className="rounded-xl border border-gray-200 px-2 py-1 text-xs"
                    onChange={(e) => assignDriver(order.id, Number(e.target.value))}
                    value={order.driver_id || ''}
                  >
                    <option value="">Assign</option>
                    {drivers.filter((d) => d.status === 'approved').map((driver) => (
                      <option key={driver.user_id} value={driver.user_id}>{driver.name}</option>
                    ))}
                  </select>
                </td>
                <td className="p-4">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/orders/${order.id}`)}>View</Button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredOrders.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-gray-500">No orders found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderDrivers = () => (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in duration-300">
      <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold text-[#2A1B7A]">Driver Management</h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Search drivers..." className="pl-9 h-10" />
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider">
              <th className="p-4 font-medium">Driver</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Verification</th>
              <th className="p-4 font-medium">Online</th>
              <th className="p-4 font-medium">Accept Rate</th>
              <th className="p-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {drivers.map((driver) => (
              <tr key={driver.id} className="hover:bg-gray-50/50">
                <td className="p-4 text-sm text-gray-700">
                  <div className="font-semibold text-gray-900">{driver.name}</div>
                  <div className="text-xs text-gray-400">{driver.email}</div>
                </td>
                <td className="p-4 text-sm text-gray-600">{driver.status}</td>
                <td className="p-4 text-sm text-gray-600">{driver.verification_status || 'pending'}</td>
                <td className="p-4 text-sm text-gray-600">{driver.is_online ? 'Online' : 'Offline'}</td>
                <td className="p-4 text-sm text-gray-600">{Math.round((driver.accept_rate || 1) * 100)}%</td>
                <td className="p-4">
                  <div className="flex gap-2">
                    {driver.status === 'pending' ? (
                      <>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => updateDriverStatus(driver.id, 'approved')}>Approve</Button>
                        <Button size="sm" variant="outline" onClick={() => updateDriverStatus(driver.id, 'rejected')}>Reject</Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => updateDriverStatus(driver.id, driver.status === 'approved' ? 'rejected' : 'approved')}>
                        {driver.status === 'approved' ? 'Suspend' : 'Re-approve'}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderMap = () => (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-4">
      <div className="flex items-center gap-3 text-[#2A1B7A] font-bold">
        <Map className="h-6 w-6 text-[#F28C3A]" /> Live Map (driver coordinates)
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {drivers.map((driver) => (
          <div key={driver.id} className="border border-gray-100 rounded-2xl p-4">
            <div className="font-semibold text-[#2A1B7A]">{driver.name}</div>
            <div className="text-sm text-gray-500">{driver.last_lat?.toFixed(4) || '—'}, {driver.last_lng?.toFixed(4) || '—'}</div>
          </div>
        ))}
        {drivers.length === 0 && <div className="text-sm text-gray-500">No drivers available.</div>}
      </div>
    </div>
  );

  const renderOperations = () => (
    <div className="space-y-8">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="text-xl font-bold text-[#2A1B7A] flex items-center gap-2">
          <Search className="h-5 w-5 text-[#F28C3A]" /> Global Search
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by tracking ID, phone, name..." />
          <Button onClick={runSearch} className="bg-[#2A1B7A] hover:bg-[#2A1B7A]/90">Search</Button>
        </div>
        {(searchResults.orders?.length > 0 || searchResults.users?.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-100 rounded-2xl p-4">
              <h4 className="font-semibold text-[#2A1B7A] mb-2">Orders</h4>
              {searchResults.orders.map((order: any) => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <span className="text-sm text-gray-600">{order.tracking_code || `#${order.id}`}</span>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/orders/${order.id}`)}>Open</Button>
                </div>
              ))}
              {searchResults.orders.length === 0 && <p className="text-sm text-gray-400">No orders found.</p>}
            </div>
            <div className="border border-gray-100 rounded-2xl p-4">
              <h4 className="font-semibold text-[#2A1B7A] mb-2">Users</h4>
              {searchResults.users.map((u: any) => (
                <div key={u.id} className="text-sm text-gray-600 py-2 border-b border-gray-100 last:border-b-0">
                  {u.name} • {u.phone || u.email}
                </div>
              ))}
              {searchResults.users.length === 0 && <p className="text-sm text-gray-400">No users found.</p>}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="text-xl font-bold text-[#2A1B7A]">Support Tickets</h2>
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="border border-gray-100 rounded-2xl p-4 flex flex-col md:flex-row justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-900">#{ticket.id} • {ticket.category}</p>
                <p className="text-sm text-gray-500">Order {ticket.tracking_code || ticket.order_id} • {ticket.order_status}</p>
                <p className="text-xs text-gray-400">{ticket.description || 'No description'}</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="rounded-xl border border-gray-200 px-3 py-2 text-xs"
                  value={ticket.status}
                  onChange={(e) => updateTicketStatus(ticket.id, e.target.value)}
                >
                  <option value="open">Open</option>
                  <option value="in_review">In Review</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>
          ))}
          {tickets.length === 0 && <p className="text-sm text-gray-400">No tickets yet.</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-xl font-bold text-[#2A1B7A]">Promos</h2>
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Code" value={promoForm.code} onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value })} />
            <select className="h-10 rounded-xl border border-gray-300 px-3" value={promoForm.discountType} onChange={(e) => setPromoForm({ ...promoForm, discountType: e.target.value })}>
              <option value="flat">Flat</option>
              <option value="percent">Percent</option>
            </select>
            <Input placeholder="Amount" type="number" value={promoForm.amount} onChange={(e) => setPromoForm({ ...promoForm, amount: Number(e.target.value) })} />
            <Input placeholder="Min spend" type="number" value={promoForm.minSpend} onChange={(e) => setPromoForm({ ...promoForm, minSpend: Number(e.target.value) })} />
          </div>
          <Button onClick={createPromo} className="bg-[#2A1B7A] hover:bg-[#2A1B7A]/90">Create Promo</Button>
          <div className="space-y-2">
            {promos.map((promo) => (
              <div key={promo.id} className="flex items-center justify-between text-sm text-gray-600">
                <span>{promo.code} • {promo.discount_type === 'percent' ? `${promo.amount}%` : formatCurrency(promo.amount)}</span>
                <button onClick={() => togglePromo(promo.id, promo.active === 0)} className="text-xs font-semibold text-[#F28C3A]">
                  {promo.active ? 'Disable' : 'Enable'}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-xl font-bold text-[#2A1B7A]">Pricing Rules</h2>
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Zone" value={pricingForm.zoneName} onChange={(e) => setPricingForm({ ...pricingForm, zoneName: e.target.value })} />
            <select className="h-10 rounded-xl border border-gray-300 px-3" value={pricingForm.serviceType} onChange={(e) => setPricingForm({ ...pricingForm, serviceType: e.target.value })}>
              <option value="express">Express</option>
              <option value="same_day">Same Day</option>
              <option value="next_day">Next Day</option>
              <option value="scheduled">Scheduled</option>
            </select>
            <Input placeholder="Base fare" type="number" value={pricingForm.baseFare} onChange={(e) => setPricingForm({ ...pricingForm, baseFare: Number(e.target.value) })} />
            <Input placeholder="Per km" type="number" value={pricingForm.perKm} onChange={(e) => setPricingForm({ ...pricingForm, perKm: Number(e.target.value) })} />
            <Input placeholder="Weight rate" type="number" value={pricingForm.weightRate} onChange={(e) => setPricingForm({ ...pricingForm, weightRate: Number(e.target.value) })} />
            <Input placeholder="Surge" type="number" step="0.1" value={pricingForm.surgeMultiplier} onChange={(e) => setPricingForm({ ...pricingForm, surgeMultiplier: Number(e.target.value) })} />
          </div>
          <Button onClick={createPricingRule} className="bg-[#2A1B7A] hover:bg-[#2A1B7A]/90">Add Rule</Button>
          <div className="space-y-2 text-sm text-gray-600">
            {pricingRules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between">
                <span>{rule.zone_name || 'All zones'} • {rule.service_type || 'All'} • {formatCurrency(rule.base_fare)}</span>
                <span className="text-xs text-gray-400">x{rule.surge_multiplier || 1}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="text-xl font-bold text-[#2A1B7A]">Service Zones</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {zones.map((zone) => (
            <div key={zone.id} className="border border-gray-100 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-800">{zone.name}</p>
                <p className="text-xs text-gray-400">{zone.status}</p>
              </div>
              <button onClick={() => updateZoneStatus(zone.id, zone.status === 'active' ? 'coming_soon' : 'active')} className="text-xs font-semibold text-[#F28C3A]">
                {zone.status === 'active' ? 'Mark coming soon' : 'Activate'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="text-xl font-bold text-[#2A1B7A]">Audit Log</h2>
        <div className="space-y-2 text-sm text-gray-600">
          {auditLogs.map((log) => (
            <div key={log.id} className="flex justify-between border-b border-gray-100 pb-2">
              <span>{log.action} • {log.entity_type} #{log.entity_id}</span>
              <span className="text-xs text-gray-400">{formatShortDate(log.created_at)}</span>
            </div>
          ))}
          {auditLogs.length === 0 && <p className="text-sm text-gray-400">No audit entries.</p>}
        </div>
      </div>
    </div>
  );

  const renderReports = () => (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-6">
      <h2 className="text-xl font-bold text-[#2A1B7A]">Operational Reports</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-gray-100">
          <p className="text-sm text-gray-500">Completed Deliveries</p>
          <p className="text-2xl font-bold text-[#2A1B7A]">{reports.completedOrders || 0}</p>
        </div>
        <div className="p-4 rounded-2xl border border-gray-100">
          <p className="text-sm text-gray-500">Cancellations</p>
          <p className="text-2xl font-bold text-[#2A1B7A]">{reports.cancellations || 0}</p>
        </div>
        <div className="p-4 rounded-2xl border border-gray-100">
          <p className="text-sm text-gray-500">At Risk</p>
          <p className="text-2xl font-bold text-orange-500">{reports.atRisk || 0}</p>
        </div>
        <div className="p-4 rounded-2xl border border-gray-100">
          <p className="text-sm text-gray-500">Late</p>
          <p className="text-2xl font-bold text-red-600">{reports.late || 0}</p>
        </div>
        <div className="p-4 rounded-2xl border border-gray-100">
          <p className="text-sm text-gray-500">Revenue</p>
          <p className="text-2xl font-bold text-[#2A1B7A]">{formatCurrency(reports.revenue || 0)}</p>
        </div>
      </div>
      <div className="text-sm text-gray-500 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" /> KPI charts will appear here in the full analytics module.
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#2A1B7A]">Admin Control Center</h1>
          <p className="text-gray-500">Monitor performance, dispatch, and drivers in real time.</p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-gray-200 overflow-x-auto pb-2">
        {['overview', 'orders', 'drivers', 'reports', 'operations', 'map'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as TabType)}
            className={`pb-2 font-medium whitespace-nowrap ${activeTab === tab ? 'text-[#2A1B7A] border-b-2 border-[#2A1B7A]' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'orders' && renderOrders()}
      {activeTab === 'drivers' && renderDrivers()}
      {activeTab === 'reports' && renderReports()}
      {activeTab === 'operations' && renderOperations()}
      {activeTab === 'map' && renderMap()}
    </div>
  );
}
