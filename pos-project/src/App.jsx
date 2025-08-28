import { useEffect, useState} from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { initDB } from './data/db';
import { seedDatabase } from './data/seedData'; // Import the seeder
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

// A component to initialize the database and check auth status
function AppContent() {
  const { currentUser } = useAuth();
  const [isSeeding, setIsSeeding] = useState(false);

   useEffect(() => {
    const initializeApp = async () => {
      await initDB(); // Initialize the database
      setIsSeeding(true);
      await seedDatabase(); // Seed with dummy data
      setIsSeeding(false);
    };
    initializeApp();
  }, []);

  if (isSeeding) {
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
       <Route path="/login" element={<Login />} />
        <Route path="/" element={currentUser ? <Dashboard /> : <Login />} />
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