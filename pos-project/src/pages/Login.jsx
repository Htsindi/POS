// src/pages/Login.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, currentUser } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(username, password);
    
    if (result.success) {
      navigate('/'); // Redirect to dashboard on success
    } else {
      setError(result.message);
    }
    
    setIsLoading(false);
  };

  // Demo credentials helper function
  const fillDemoCredentials = (role) => {
    if (role === 'owner') {
      setUsername('admin');
      setPassword('admin123');
    } else if (role === 'assistant') {
      setUsername('john_assistant');
      setPassword('assist123');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold text-center mb-6">Memory Grocery Shop Login</h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your username"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 p-4 bg-gray-50 rounded-md">
          <p className="text-sm text-gray-600 text-center mb-2">
            Demo Credentials:
          </p>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => fillDemoCredentials('owner')}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs py-1 px-2 rounded"
            >
              Owner
            </button>
            <button
              type="button"
              onClick={() => fillDemoCredentials('assistant')}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 px-2 rounded"
            >
              Assistant
            </button>
          </div>
          <p className="text-xs text-gray-500 text-center mt-2">
            Click to auto-fill credentials
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;