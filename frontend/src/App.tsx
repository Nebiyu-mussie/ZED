/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import CustomerDashboard from './pages/CustomerDashboard';
import DriverDashboard from './pages/DriverDashboard';
import AdminDashboard from './pages/AdminDashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import DispatcherDashboard from './pages/DispatcherDashboard';
import Tracking from './pages/Tracking';
import Unauthorized from './pages/Unauthorized';
import OrderDetails from './pages/OrderDetails';
import { apiFetch } from './lib/api';

const ADMIN_ROLES = ['admin', 'manager'];
const SUPER_ADMIN_ROLES = ['super_admin'];
const DISPATCHER_ROLES = ['dispatcher'];

// Simple protected route wrapper
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  
  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }

  const user = JSON.parse(userStr);
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default function App() {
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && !userStr) {
      apiFetch('/api/auth/me')
        .then((data) => {
          localStorage.setItem('user', JSON.stringify(data.user));
        })
        .catch(() => {
          localStorage.removeItem('token');
        });
    }
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Landing />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="tracking/:id" element={<Tracking />} />
          <Route path="orders/:id" element={
            <ProtectedRoute allowedRoles={['customer', 'driver', ...ADMIN_ROLES, ...SUPER_ADMIN_ROLES, ...DISPATCHER_ROLES]}>
              <OrderDetails />
            </ProtectedRoute>
          } />
          <Route path="unauthorized" element={<Unauthorized />} />
          
          <Route path="customer-dashboard" element={
            <ProtectedRoute allowedRoles={['customer']}>
              <CustomerDashboard />
            </ProtectedRoute>
          } />

          <Route path="driver-dashboard" element={
            <ProtectedRoute allowedRoles={['driver']}>
              <DriverDashboard />
            </ProtectedRoute>
          } />

          <Route path="dispatcher-dashboard" element={
            <ProtectedRoute allowedRoles={DISPATCHER_ROLES}>
              <DispatcherDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="admin-dashboard" element={
            <ProtectedRoute allowedRoles={ADMIN_ROLES}>
              <AdminDashboard />
            </ProtectedRoute>
          } />

          <Route path="super-admin-dashboard" element={
            <ProtectedRoute allowedRoles={SUPER_ADMIN_ROLES}>
              <SuperAdminDashboard />
            </ProtectedRoute>
          } />
        </Route>
      </Routes>
    </Router>
  );
}
