import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from '../lib/api.js';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const saved = localStorage.getItem('user');
      if (saved) setUser(JSON.parse(saved));
    }
    setLoading(false);
  }, [token]);

  const _persist = (t, u) => {
    localStorage.setItem('token', t);
    localStorage.setItem('user',  JSON.stringify(u));
    axios.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    setToken(t); setUser(u);
  };

  const login = async (username, password) => {
    const { data } = await axios.post('/api/auth/login', { username, password });
    _persist(data.token, data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null); setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
