import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PasswordInput } from '../components/ui/PasswordInput';
import { Package } from 'lucide-react';
import { apiFetch } from '../lib/api';

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const dashboardForRole = (role: string) => {
    if (role === 'super_admin') return '/super-admin-dashboard';
    if (role === 'admin' || role === 'manager') return '/admin-dashboard';
    if (role === 'dispatcher') return '/dispatcher-dashboard';
    if (role === 'driver') return '/driver-dashboard';
    return '/customer-dashboard';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      navigate(dashboardForRole(data.user.role));
    } catch (err: any) {
      setError(err?.error || err?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] py-12">
      <div className="w-full max-w-xl bg-white p-8 sm:p-10 rounded-[2rem] shadow-xl border border-gray-100">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-[#2A1B7A] p-3 rounded-2xl mb-4">
            <Package className="h-8 w-8 text-[#F28C3A]" />
          </div>
          <h2 className="text-3xl font-bold text-[#2A1B7A]">Create Account</h2>
          <p className="text-gray-500 mt-2">Join Zemen Express Delivery System</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 text-center border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 ml-1">Full Name</label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
                className="h-12 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 ml-1">Email Address</label>
              <Input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="you@example.com"
                className="h-12 rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 ml-1">Password</label>
            <PasswordInput
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
              className="h-12 rounded-xl"
            />
          </div>

          <div className="bg-amber-50 text-amber-700 p-4 rounded-xl text-sm border border-amber-100">
            Customer registration only. Staff accounts are created by the system administrator.
          </div>

          <Button type="submit" className="w-full h-14 text-lg rounded-2xl mt-8" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-[#2A1B7A] hover:underline">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
}
