import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { LocalAuthProvider, useAuth as useLocalAuth } from '@/lib/LocalAuthContext';
import ScrollToTop from './components/ScrollToTop';
import Login from "@/pages/Login";
import CashRegister from "@/pages/CashRegister";
import Dashboard from "@/pages/Dashboard";
import NewSale from "@/pages/NewSale";
import Inventory from "@/pages/Inventory";
import SalesReports from "@/pages/SalesReports";
import Customers from "@/pages/Customers";
import Settings from "@/pages/Settings";
import Expenses from "@/pages/Expenses";

function Protected() {
  const { user, registerOpen } = useLocalAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (registerOpen) return <Navigate to="/cash-register" replace />;
  return <Outlet />;
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Offline / unknown platform errors fall through to the local offline POS app,
  // which has its own local authentication (no network required).
  if (authError && authError.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  return (
    <LocalAuthProvider>
      <ScrollToTop />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/cash-register" element={<CashRegister />} />
        <Route element={<Protected />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pos" element={<NewSale />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/reports" element={<SalesReports />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </LocalAuthProvider>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
