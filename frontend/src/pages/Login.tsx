import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Package } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
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
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-[#2A1B7A] p-3 rounded-2xl mb-4">
            <Package className="h-8 w-8 text-[#F28C3A]" />
          </div>
          <h2 className="text-2xl font-bold text-[#2A1B7A]">Welcome Back</h2>
          <p className="text-gray-500 mt-2">Sign in to Zemen Express</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 text-center border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 ml-1">Email Address</label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-12 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 ml-1">Password</label>
            <Input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-12 rounded-xl"
            />
          </div>
          <Button type="submit" className="w-full h-12 text-lg rounded-xl mt-4" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-500">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-[#F28C3A] hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
