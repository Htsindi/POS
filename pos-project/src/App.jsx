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

// A component to initialize the database and check auth status
function AppContent() {
  const { currentUser } = useAuth();
  const [isSeeding, setIsSeeding] = useState(false);
   const [isAppInitialized, setIsAppInitialized] = useState(false);

   useEffect(() => {
    const initializeApp = async () => {
      await initDB(); // Initialize the database
      setIsSeeding(true);
      await seedDatabase(); // Seed with dummy data
      setIsSeeding(false);
      setIsAppInitialized(true);
    };
    initializeApp();
  }, []);

  if (isSeeding || !isAppInitialized || currentUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading grocery data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <Routes>
        {/* Public route */}
        <Route path="/login" element={<Login />} />
        
        {/* Protected routes */}
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
        
        {/* Fallback route - redirect to login for any unknown paths */}
        <Route path="*" element={<Login />} />
      </Routes>
    </div>
  );
}

// The main App component wrapped with the AuthProvider
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;