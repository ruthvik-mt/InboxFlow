import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import './App.css';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    console.log('[ProtectedRoute] ========================================');
    console.log('[ProtectedRoute] Current path:', location.pathname);
    console.log('[ProtectedRoute] Loading state:', loading);
    console.log('[ProtectedRoute] User state:', user ? `${user.email} (${user._id})` : 'null');
    console.log('[ProtectedRoute] ========================================');
  }, [loading, user, location]);

  if (loading) {
    console.log('[ProtectedRoute] 🔄 Still loading, showing spinner...');
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('[ProtectedRoute] ❌ No user found, redirecting to /login');
    return <Navigate to="/login" replace />;
  }

  console.log('[ProtectedRoute] ✅ User authenticated, rendering protected content');
  return <>{children}</>;
};

function AppRoutes() {
  const location = useLocation();
  
  useEffect(() => {
    console.log('[AppRoutes] Route changed to:', location.pathname);
  }, [location]);

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  useEffect(() => {
    console.log('[App] Application initialized');
  }, []);

  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;