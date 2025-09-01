// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getUsers } from '../data/db';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
          const user = JSON.parse(savedUser);
          // Verify user still exists in database
          const users = await getUsers();
          const userExists = users.find(u => u.id === user.id);
          if (userExists) {
            setCurrentUser(user);
          } else {
            localStorage.removeItem('currentUser');
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
        localStorage.removeItem('currentUser');
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (username, password) => {
    try {
      const users = await getUsers();
      const user = users.find(u => u.username === username && u.password === password);
      
      if (user) {
        const { password: _, ...userWithoutPassword } = user;
        setCurrentUser(userWithoutPassword);
        localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));
        return { success: true };
      }
      return { success: false, message: 'Invalid credentials' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Login failed. Please try again.' };
    }
  };

  const logout = () => {
    // Clear both state and localStorage
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    
    // Force a complete state reset by reloading the app
    // This ensures all components re-initialize properly
    window.location.href = '/login';
  };

  const value = {
    currentUser,
    login,
    logout,
    authLoading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};