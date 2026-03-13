import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Package } from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'customer',
    phone: '',
    vehicleType: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      navigate(`/${data.user.role}-dashboard`);
    } catch (err: any) {
      setError(err.message);
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
            <Input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
              className="h-12 rounded-xl"
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 ml-1">I am a...</label>
            <div className="grid grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: 'customer' })}
                className={`p-4 rounded-2xl border-2 text-center transition-all ${
                  formData.role === 'customer'
                    ? 'border-[#F28C3A] bg-[#F28C3A]/5 text-[#F28C3A] font-bold'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                Customer
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: 'driver' })}
                className={`p-4 rounded-2xl border-2 text-center transition-all ${
                  formData.role === 'driver'
                    ? 'border-[#2A1B7A] bg-[#2A1B7A]/5 text-[#2A1B7A] font-bold'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                Driver
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: 'admin' })}
                className={`p-4 rounded-2xl border-2 text-center transition-all ${
                  formData.role === 'admin'
                    ? 'border-green-600 bg-green-50 text-green-600 font-bold'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                Admin
              </button>
            </div>
          </div>

          {formData.role === 'driver' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 ml-1">Phone Number</label>
                <Input
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+251 911 123456"
                  className="h-12 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 ml-1">Vehicle Type</label>
                <select
                  required
                  value={formData.vehicleType}
                  onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                  className="flex h-12 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F28C3A]"
                >
                  <option value="">Select Vehicle</option>
                  <option value="motorcycle">Motorcycle</option>
                  <option value="car">Car</option>
                  <option value="van">Van / Truck</option>
                </select>
              </div>
            </div>
          )}

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
