import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const CATEGORIES = ['Phones', 'Laptops', 'Tablets', 'TVs', 'Audio', 'Accessories', 'Gaming', 'Cameras', 'Other'];
const WARRANTIES  = ['No warranty', '3 months', '6 months', '1 year', '2 years', '3 years'];

const CATEGORY_ICONS = {
  Phones: '📱', Laptops: '💻', Tablets: '📲', TVs: '📺',
  Audio: '🎧', Accessories: '🔌', Gaming: '🎮', Cameras: '📷', Other: '⚙️'
};

const GoodsPage = ({ onSellMode }) => {
  const [products, setProducts] = useState([]);
  const [stats,    setStats]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [search,   setSearch]   = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [sortBy,   setSortBy]   = useState('createdAt');
  const [form, setForm] = useState({
    name: '', brand: '', model: '', category: 'Phones', sku: '',
    price: '', costPrice: '', quantity: '', warranty: '1 year', description: ''
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [pRes, sRes] = await Promise.all([axios.get('/api/products'), axios.get('/api/stats')]);
      setProducts(pRes.data);
      setStats(sRes.data);
    } catch { toast.error('Failed to load data'); }
    finally   { setLoading(false); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price || form.quantity === '') return toast.error('Name, price and quantity required');
    try {
      if (editItem) {
        const res = await axios.put(`/api/products/${editItem._id}`, form);
        setProducts(ps => ps.map(p => p._id === editItem._id ? res.data : p));
        toast.success('Gadget updated');
      } else {
        const res = await axios.post('/api/products', form);
        setProducts(ps => [res.data, ...ps]);
        toast.success('Gadget added');
      }
      fetchStats();
      resetForm();
    } catch (err) { toast.error(err.response?.data?.message || 'Error saving'); }
  };

  const fetchStats = async () => {
    try { const r = await axios.get('/api/stats'); setStats(r.data); } catch {}
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setForm({
      name: item.name, brand: item.brand, model: item.model,
      category: item.category, sku: item.sku, price: item.price,
      costPrice: item.costPrice, quantity: item.quantity,
      warranty: item.warranty, description: item.description
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await axios.delete(`/api/products/${id}`);
      setProducts(ps => ps.filter(p => p._id !== id));
      fetchStats();
      toast.success('Deleted');
    } catch { toast.error('Delete failed'); }
  };

  const handleQty = async (item, delta) => {
    const newQty = Math.max(0, item.quantity + delta);
    try {
      const res = await axios.put(`/api/products/${item._id}`, { ...item, quantity: newQty });
      setProducts(ps => ps.map(p => p._id === item._id ? res.data : p));
    } catch { toast.error('Update failed'); }
  };

  const resetForm = () => {
    setForm({ name: '', brand: '', model: '', category: 'Phones', sku: '', price: '', costPrice: '', quantity: '', warranty: '1 year', description: '' });
    setShowForm(false); setEditItem(null);
  };

  const filtered = products
    .filter(p => {
      const q = search.toLowerCase();
      return (p.name.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q) || p.model?.toLowerCase().includes(q)) &&
             (catFilter === 'All' || p.category === catFilter);
    })
    .sort((a, b) => {
      if (sortBy === 'price')    return b.price - a.price;
      if (sortBy === 'quantity') return b.quantity - a.quantity;
      if (sortBy === 'name')     return a.name.localeCompare(b.name);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  const fmt = (n) => Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2 });

  if (loading) return <div className="page-loading"><div className="pulse-ring" /><span>Loading inventory...</span></div>;

  return (
    <div className="goods-page">
      {/* Stats Bar */}
      {stats && (
        <div className="stats-bar">
          <div className="stat-card">
            <span className="stat-icon">📦</span>
            <div><div className="stat-val">{stats.totalItems}</div><div className="stat-lbl">Gadgets</div></div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🔢</span>
            <div><div className="stat-val">{stats.totalStock}</div><div className="stat-lbl">Total Units</div></div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">💰</span>
            <div><div className="stat-val">₦{(stats.inventoryValue/1000).toFixed(0)}k</div><div className="stat-lbl">Stock Value</div></div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">📈</span>
            <div><div className="stat-val">₦{(stats.totalSales/1000).toFixed(0)}k</div><div className="stat-lbl">Total Sales</div></div>
          </div>
          {stats.lowStock > 0 && (
            <div className="stat-card alert">
              <span className="stat-icon">⚠️</span>
              <div><div className="stat-val">{stats.lowStock}</div><div className="stat-lbl">Low Stock</div></div>
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <h2>Gadgets</h2>
          <span className="subtitle">{products.length} gadgets</span>
        </div>
        <div className="header-actions">
          <button className="btn-sell" onClick={onSellMode}>🧾 New Receipt</button>
          <button className="btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>+ Add Gadget</button>
        </div>
      </div>

      {/* Filters */}
      <div className="toolbar">
        <input className="search-input" placeholder="Search by name, brand, model…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="createdAt">Newest first</option>
          <option value="name">Name A-Z</option>
          <option value="price">Price ↓</option>
          <option value="quantity">Stock ↓</option>
        </select>
      </div>
      <div className="cat-pills">
        {['All', ...CATEGORIES].map(c => (
          <button key={c} className={`pill ${catFilter === c ? 'active' : ''}`} onClick={() => setCatFilter(c)}>
            {CATEGORY_ICONS[c] || ''} {c}
          </button>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && resetForm()}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editItem ? '✏️ Edit Gadget' : '➕ Add Gadget'}</h3>
              <button className="close-btn" onClick={resetForm}>×</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="field-row">
                <div className="field flex2">
                  <label>Gadget Name *</label>
                  <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. iPhone 15 Pro Max" />
                </div>
                <div className="field">
                  <label>Category</label>
                  <select value={form.category} onChange={e => set('category', e.target.value)}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Brand</label>
                  <input value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="Apple, Samsung…" />
                </div>
                <div className="field">
                  <label>Model</label>
                  <input value={form.model} onChange={e => set('model', e.target.value)} placeholder="Model number" />
                </div>
                <div className="field">
                  <label>SKU</label>
                  <input value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="Optional" />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Selling Price (₦) *</label>
                  <input type="number" min="0" step="0.01" value={form.price} onChange={e => set('price', e.target.value)} placeholder="0.00" />
                </div>
                <div className="field">
                  <label>Cost Price (₦)</label>
                  <input type="number" min="0" step="0.01" value={form.costPrice} onChange={e => set('costPrice', e.target.value)} placeholder="0.00" />
                </div>
                <div className="field">
                  <label>Quantity *</label>
                  <input type="number" min="0" value={form.quantity} onChange={e => set('quantity', e.target.value)} placeholder="0" />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Warranty</label>
                  <select value={form.warranty} onChange={e => set('warranty', e.target.value)}>
                    {WARRANTIES.map(w => <option key={w}>{w}</option>)}
                  </select>
                </div>
                <div className="field flex2">
                  <label>Description</label>
                  <input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Optional product notes" />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={resetForm}>Cancel</button>
                <button type="submit" className="btn-primary">{editItem ? 'Update' : 'Add Gadget'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Gadgets Table */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <h3>No gadgets found</h3>
          <p>{products.length === 0 ? 'Add your first gadget to get started' : 'Try a different search or filter'}</p>
          {products.length === 0 && <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => setShowForm(true)}>+ Add First Gadget</button>}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="products-table">
            <thead>
              <tr>
                <th>Gadget</th>
                <th>Category</th>
                <th>Selling Price</th>
                <th>Margin</th>
                <th>Stock</th>
                <th>Warranty</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const margin = p.costPrice > 0 ? (((p.price - p.costPrice) / p.price) * 100).toFixed(0) : null;
                return (
                  <tr key={p._id} className={p.quantity === 0 ? 'out-of-stock' : p.quantity < 3 ? 'low-stock' : ''}>
                    <td>
                      <div className="product-cell">
                        <div className="product-icon">{CATEGORY_ICONS[p.category] || '⚙️'}</div>
                        <div>
                          <div className="product-name">{p.name}</div>
                          <div className="product-meta">
                            {p.brand && <span>{p.brand}</span>}
                            {p.model && <span>· {p.model}</span>}
                            {p.sku   && <span className="sku">SKU: {p.sku}</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td><span className="cat-chip">{CATEGORY_ICONS[p.category]} {p.category}</span></td>
                    <td className="price-cell">₦{fmt(p.price)}</td>
                    <td>{margin !== null ? <span className={`margin-chip ${margin > 20 ? 'good' : margin > 0 ? 'mid' : 'low'}`}>{margin}%</span> : <span className="no-data">—</span>}</td>
                    <td>
                      <div className="qty-ctrl">
                        <button onClick={() => handleQty(p, -1)}>−</button>
                        <span className={p.quantity === 0 ? 'qty-zero' : p.quantity < 3 ? 'qty-low' : ''}>{p.quantity}</span>
                        <button onClick={() => handleQty(p, 1)}>+</button>
                      </div>
                      {p.quantity === 0 && <span className="badge out">Out of Stock</span>}
                      {p.quantity > 0 && p.quantity < 3 && <span className="badge low">Low Stock</span>}
                    </td>
                    <td><span className="warranty-chip">{p.warranty}</span></td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-btn edit" onClick={() => handleEdit(p)} title="Edit">✏️</button>
                        <button className="icon-btn del"  onClick={() => handleDelete(p._id)} title="Delete">🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default GoodsPage;
