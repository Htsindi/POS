// src/App.jsx
import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { initDB } from './data/db';
import { seedDatabase } from './data/seedData';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import SalesHistory from './pages/SalesHistory';
import Customers from './pages/Customers';

function AppContent() {
  const { authLoading } = useAuth();
  const [isSeeding, setIsSeeding] = useState(false);
  const [isAppInitialized, setIsAppInitialized] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await initDB();
        setIsSeeding(true);
        await seedDatabase();
      } catch (error) {
        console.error('App initialization error:', error);
      } finally {
        setIsSeeding(false);
        setIsAppInitialized(true);
      }
    };
    initializeApp();
  }, []);

  // Show loading spinner while app is initializing or auth is loading
  if (isSeeding || !isAppInitialized || authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading application...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/pos" element={
          <ProtectedRoute>
            <POS />
          </ProtectedRoute>
        } />
        <Route path="/inventory" element={
          <ProtectedRoute requiredRole="owner">
            <Inventory />
          </ProtectedRoute>
        } />
        <Route path="/sales" element={
          <ProtectedRoute>
            <SalesHistory />
          </ProtectedRoute>
        } />
        <Route path="/customers" element={
          <ProtectedRoute>
            <Customers />
          </ProtectedRoute>
        } />
        {/* Catch all route - redirect to login */}
        <Route path="*" element={<Login />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;