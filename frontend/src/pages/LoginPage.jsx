import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import toast from "react-hot-toast";
import "./LoginPage.css";

const LoginPage = () => {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ username: "", password: "" });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password)
      return toast.error("Fill in username & password");
    setLoading(true);
    try {
      await login(form.username, form.password);
      toast.success("Welcome back!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg-grid" />
      <div className="login-glow" />

      <div className="login-shell">
        <div className="login-left">
          <div className="login-left-inner">
            <div className="login-left-brand">
              <img
                className="login-left-logo"
                src="/logo.jpeg"
                alt="JaisHeart Gadget"
              />
              <div>
                <h1>JaisHeart Gadget</h1>
                <p>Admin dashboard for gadgets, inventory and receipts.</p>
              </div>
            </div>

            <div className="login-chips">
              <span className="chip">Inventory</span>
              <span className="chip">Receipts</span>
              <span className="chip">Print-ready</span>
            </div>

            <ul className="login-features">
              <li>
                <span className="dot" />
                Create new gadgets and manage stock
              </li>
              <li>
                <span className="dot" />
                Generate receipts in seconds
              </li>
            </ul>
          </div>
        </div>

        <div className="login-card">
          <div className="login-card-head">
            <div className="brand-icon">
              <img
                className="brand-icon-img"
                src="/logo.jpeg"
                alt="JaisHeart Gadget"
              />
            </div>
            <div>
              <h2>Sign in</h2>
              <p>Use your admin username and password.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Username</label>
              <input
                placeholder="Enter username"
                value={form.username}
                onChange={(e) => set("username", e.target.value)}
                autoComplete="username"
              />
            </div>

            <div className="field">
              <label>Password</label>
              <div className="input-wrap">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="pw-toggle"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button className="btn-submit" disabled={loading}>
              {loading ? <span className="spinner" /> : "Sign In"}
              {!loading && <span className="btn-arrow">→</span>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
