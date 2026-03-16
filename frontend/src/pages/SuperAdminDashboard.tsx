import { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, Users, Truck, Package, AlertTriangle } from 'lucide-react';
import { apiFetch, formatCurrency, formatShortDate } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PasswordInput } from '../components/ui/PasswordInput';
import { useToast } from '../components/ui/Toast';

type CreateAdminForm = {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'manager' | 'dispatcher';
};

export default function SuperAdminDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [reports, setReports] = useState<any>({});
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<CreateAdminForm>({
    name: '',
    email: '',
    password: '',
    role: 'admin',
  });
  const toast = useToast();

  const ACTIVE_BADGES: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-red-100 text-red-700',
  };

  const ROLE_BADGES: Record<string, string> = {
    super_admin: 'bg-indigo-100 text-indigo-700',
    admin: 'bg-blue-100 text-blue-700',
    manager: 'bg-cyan-100 text-cyan-700',
    dispatcher: 'bg-purple-100 text-purple-700',
    driver: 'bg-amber-100 text-amber-700',
    customer: 'bg-gray-100 text-gray-700',
  };

  const fetchData = async () => {
    try {
      const [usersRes, ordersRes, reportRes, auditRes] = await Promise.all([
        apiFetch('/api/users'),
        apiFetch('/api/orders'),
        apiFetch('/api/admin/reports'),
        apiFetch('/api/admin/audit'),
      ]);
      setUsers(usersRes || []);
      setOrders(ordersRes || []);
      setReports(reportRes || {});
      setAuditLogs(auditRes || []);
    } catch (error: any) {
      toast.push({ title: 'Failed to load super admin data', description: error.error || '', variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totals = useMemo(() => {
    const byRole = users.reduce((acc: Record<string, number>, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {});
    return {
      totalUsers: users.length,
      admins: (byRole.admin || 0) + (byRole.manager || 0),
      dispatchers: byRole.dispatcher || 0,
      drivers: byRole.driver || 0,
      customers: byRole.customer || 0,
    };
  }, [users]);

  const createAdmin = async () => {
    try {
      await apiFetch('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(createForm),
      });
      toast.push({ title: 'Account created', variant: 'success' });
      setCreateForm({ name: '', email: '', password: '', role: 'admin' });
      setShowCreateForm(false);
      fetchData();
    } catch (error: any) {
      toast.push({ title: 'Unable to create account', description: error.error || '', variant: 'error' });
    }
  };

  const toggleUserActive = async (userId: string, nextActive: boolean) => {
    setUpdatingUser(userId);
    try {
      await apiFetch(`/api/admin/users/${userId}/active`, {
        method: 'PUT',
        body: JSON.stringify({ active: nextActive }),
      });
      toast.push({ title: `User ${nextActive ? 'activated' : 'deactivated'}`, variant: 'success' });
      fetchData();
    } catch (error: any) {
      toast.push({ title: 'Unable to update user', description: error.error || '', variant: 'error' });
    } finally {
      setUpdatingUser(null);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading super admin dashboard...</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#2A1B7A]">Super Admin Console</h1>
          <p className="text-gray-500">Manage admins and monitor system activity.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-blue-100 p-4 rounded-2xl text-blue-600">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Users</p>
            <p className="text-2xl font-bold text-[#2A1B7A]">{totals.totalUsers}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-indigo-100 p-4 rounded-2xl text-indigo-600">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Admins</p>
            <p className="text-2xl font-bold text-[#2A1B7A]">{totals.admins}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-orange-100 p-4 rounded-2xl text-[#F28C3A]">
            <Package className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Orders</p>
            <p className="text-2xl font-bold text-[#2A1B7A]">{orders.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-green-100 p-4 rounded-2xl text-green-600">
            <Truck className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Drivers</p>
            <p className="text-2xl font-bold text-[#2A1B7A]">{totals.drivers}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#2A1B7A]">Admin Accounts</h2>
            <Button variant="outline" size="sm" onClick={() => setShowCreateForm((prev) => !prev)}>
              {showCreateForm ? 'Close Form' : 'Add Admin / Manager'}
            </Button>
          </div>

          {showCreateForm && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input placeholder="Full name" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} />
              <Input placeholder="Email" type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} />
              <PasswordInput placeholder="Password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} />
              <select
                className="h-10 rounded-xl border border-gray-300 px-3"
                value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as CreateAdminForm['role'] })}
              >
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="dispatcher">Dispatcher</option>
              </select>
              <div className="md:col-span-2">
                <Button onClick={createAdmin} className="bg-[#2A1B7A] hover:bg-[#2A1B7A]/90">Create Account</Button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 uppercase tracking-wider text-xs">
                  <th className="p-3 font-medium">Name</th>
                  <th className="p-3 font-medium">Email</th>
                  <th className="p-3 font-medium">Role</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => {
                  const statusKey = user.is_active === false ? 'inactive' : 'active';
                  return (
                    <tr key={user.id} className="hover:bg-gray-50/50">
                      <td className="p-3 font-medium text-gray-800">{user.name}</td>
                      <td className="p-3 text-gray-600">{user.email}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold uppercase ${ROLE_BADGES[user.role] || 'bg-gray-100 text-gray-700'}`}>
                          {user.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold uppercase ${ACTIVE_BADGES[statusKey]}`}>
                          {statusKey}
                        </span>
                      </td>
                      <td className="p-3">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={user.role === 'super_admin' || updatingUser === user.id}
                          onClick={() => toggleUserActive(user.id, user.is_active === false)}
                        >
                          {user.is_active === false ? 'Activate' : 'Deactivate'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-gray-500">No users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-xl font-bold text-[#2A1B7A]">Revenue Overview</h2>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Total Revenue</span>
              <span className="font-semibold text-[#2A1B7A]">{formatCurrency(reports.revenue || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Completed Orders</span>
              <span className="font-semibold">{reports.completedOrders || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Late Deliveries</span>
              <span className="font-semibold text-red-500">{reports.late || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>At Risk</span>
              <span className="font-semibold text-orange-500">{reports.atRisk || 0}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="text-xl font-bold text-[#2A1B7A] flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-[#F28C3A]" /> Audit & Fraud Watch
        </h2>
        <div className="space-y-2 text-sm text-gray-600">
          {auditLogs.map((log) => (
            <div key={log.id} className="flex justify-between border-b border-gray-100 pb-2">
              <span>{log.action} • {log.entity_type} #{log.entity_id} • {log.actor_role || 'system'}</span>
              <span className="text-xs text-gray-400">{formatShortDate(log.created_at)}</span>
            </div>
          ))}
          {auditLogs.length === 0 && <p className="text-sm text-gray-400">No audit entries yet.</p>}
        </div>
      </div>
    </div>
  );
}
