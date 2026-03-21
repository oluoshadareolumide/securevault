// ============================================================
// src/App.js — Main application with routing
// ============================================================
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';

// Pages
import Login       from './pages/Login';
import Register    from './pages/Register';
import Dashboard   from './pages/Dashboard';
import Send        from './pages/Send';
import Packages    from './pages/Packages';
import PackageDetail from './pages/PackageDetail';
import Receive     from './pages/Receive';
import Settings    from './pages/Settings';

// Protected route wrapper
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#0d1523',
              color: '#e8f0fe',
              border: '1px solid #1a2d45',
              borderRadius: '12px',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '0.88rem'
            },
            success: { iconTheme: { primary: '#00ff88', secondary: '#080c14' } },
            error:   { iconTheme: { primary: '#ff4757', secondary: '#080c14' } }
          }}
        />
        <Routes>
          {/* Public routes */}
          <Route path="/login"        element={<Login />} />
          <Route path="/register"     element={<Register />} />
          <Route path="/receive/:id"  element={<Receive />} />

          {/* Protected routes inside layout */}
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index                     element={<Dashboard />} />
            <Route path="send"               element={<Send />} />
            <Route path="packages"           element={<Packages />} />
            <Route path="packages/:id"       element={<PackageDetail />} />
            <Route path="settings"           element={<Settings />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
