import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import LoginPage from './pages/LoginPage.jsx';
import GoodsPage from './pages/GoodsPage.jsx';
import SellPage  from './pages/SellPage.jsx';
import './App.css';

const AppInner = () => {
  const { user, loading, logout } = useAuth();
  const [page, setPage] = useState('goods');

  if (loading) return (
    <div className="page-loading full">
      <div className="pulse-ring" />
      <span>Loading…</span>
    </div>
  );

  if (!user) return <LoginPage />;

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-brand">
          <img className="brand-logo" src="/logo.jpeg" alt="JaisHeart Gadget" />
          <span>{user?.shopName || 'JaisHeart Gadget'}</span>
        </div>
        <div className="nav-tabs">
          <button className={page === 'goods' ? 'active' : ''} onClick={() => setPage('goods')}>
            <span>📦</span> Gadgets
          </button>
          <button className={page === 'sell' ? 'active' : ''} onClick={() => setPage('sell')}>
            <span>🧾</span> Receipt
          </button>
        </div>
        <div className="nav-user">
          <div className="nav-avatar">{user.username[0].toUpperCase()}</div>
          <span className="nav-uname">{user.username}</span>
          <button className="btn-logout" onClick={logout}>Sign Out</button>
        </div>
      </nav>

      <main className="app-main">
        {page === 'goods' && <GoodsPage onSellMode={() => setPage('sell')} />}
        {page === 'sell'  && <SellPage  onBack={() => setPage('goods')} />}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" toastOptions={{ style: { background: '#1e1e28', color: '#f0eef8', border: '1px solid #2a2a38' } }} />
      <AppInner />
    </AuthProvider>
  );
}
