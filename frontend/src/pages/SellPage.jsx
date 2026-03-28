import React, { useState, useEffect, useRef } from "react";
import axios from "../lib/api.js";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext.jsx";
import { motion, AnimatePresence } from "framer-motion";
import "./SellPage.css";

const CATEGORY_ICONS = {
  Phones: "📱",
  Laptops: "💻",
  Tablets: "📲",
  TVs: "📺",
  Audio: "🎧",
  Accessories: "🔌",
  Gaming: "🎮",
  Cameras: "📷",
  Other: "⚙️",
};

const PAY_METHODS = ["Cash", "Bank Transfer", "POS / Card", "Mobile Money"];

const pageVariants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.06,
    },
  },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
  },
};

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.985 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
  },
  exit: { opacity: 0, y: -10, scale: 0.985, transition: { duration: 0.16 } },
};

const SellPage = ({ onBack }) => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [customPrices, setCustomPrices] = useState({}); // Track custom prices per item
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [taxRate, setTaxRate] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [discountVisible, setDiscountVisible] = useState(false);
  const [payMethod, setPayMethod] = useState("Cash");
  const [customer, setCustomer] = useState({ name: "", phone: "" });
  const [savedReceipt, setSavedReceipt] = useState(null);
  const [loading, setLoading] = useState(false);
  const printRef = useRef();
  const receiptKey = user?.id ? `jhg:lastReceipt:${user.id}` : null;

  useEffect(() => {
    if (!receiptKey || savedReceipt) return;
    const raw = localStorage.getItem(receiptKey);
    if (!raw) return;
    try {
      setSavedReceipt(JSON.parse(raw));
    } catch {}
  }, [receiptKey]);

  useEffect(() => {
    if (!receiptKey || !savedReceipt) return;
    localStorage.setItem(receiptKey, JSON.stringify(savedReceipt));
  }, [receiptKey, savedReceipt]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await axios.get("/api/products");
      setProducts(res.data.filter((p) => p.quantity > 0));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load gadgets");
    }
  };

  const addToCart = (item) => {
    const existing = cart.find((c) => c._id === item._id);
    if (existing) {
      if (existing.sellQty >= item.quantity)
        return toast.error("Insufficient stock");
      setCart(
        cart.map((c) =>
          c._id === item._id ? { ...c, sellQty: c.sellQty + 1 } : c,
        ),
      );
    } else {
      setCart([...cart, { ...item, sellQty: 1 }]);
    }
    toast.success(`${item.name} added`, { duration: 700, icon: "✅" });
  };

  const updateQty = (id, val) => {
    const good = products.find((g) => g._id === id);
    if (val < 1) return removeFromCart(id);
    if (val > good.quantity) return toast.error("Exceeds available stock");
    setCart(cart.map((c) => (c._id === id ? { ...c, sellQty: val } : c)));
  };

  const removeFromCart = (id) => {
    setCart(cart.filter((c) => c._id !== id));
    setCustomPrices((prev) => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  };

  const subtotal = cart.reduce((s, c) => {
    const itemPrice =
      customPrices[c._id] !== undefined ? customPrices[c._id] : c.price;
    return s + itemPrice * c.sellQty;
  }, 0);
  const discountAmt = Math.min(discount, subtotal);
  const taxable = subtotal - discountAmt;
  const taxAmt = taxable * (taxRate / 100);
  const total = taxable + taxAmt;

  const categories = ["All", ...new Set(products.map((p) => p.category))];
  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    return (
      (p.name.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q)) &&
      (catFilter === "All" || p.category === catFilter)
    );
  });

  const handleGenerate = async () => {
    if (cart.length === 0) return toast.error("Add at least one item");
    setLoading(true);
    try {
      const items = cart.map((c) => {
        const itemPrice =
          customPrices[c._id] !== undefined ? customPrices[c._id] : c.price;
        return {
          productId: c._id,
          name: c.name,
          brand: c.brand,
          category: c.category,
          model: c.model,
          price: itemPrice,
          quantity: c.sellQty,
          subtotal: itemPrice * c.sellQty,
          warranty: c.warranty,
        };
      });
      const res = await axios.post("/api/receipts", {
        customerName: customer.name,
        customerPhone: customer.phone,
        items,
        subtotal,
        discount: discountAmt,
        tax: taxAmt,
        taxRate,
        total,
        payMethod,
      });
      setSavedReceipt(res.data);
      toast.success("Receipt generated!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to generate receipt");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const html = printRef.current.innerHTML;
    const w = window.open("", "_blank");
    w.document.write(`
      <!DOCTYPE html><html><head><title>Receipt ${savedReceipt.receiptNumber}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Courier New', monospace; width: 320px; margin: 0 auto; padding: 24px 16px; background: #fff; color: #111; }
        .r-header { text-align: center; margin-bottom: 12px; }
        .r-shop   { font-size: 20px; font-weight: bold; letter-spacing: 1px; }
        .r-addr   { font-size: 11px; color: #555; margin-top: 2px; }
        .r-divider{ border: none; border-top: 1px dashed #aaa; margin: 10px 0; }
        .r-meta   { font-size: 11px; display: flex; justify-content: space-between; margin: 3px 0; }
        .r-item   { margin: 6px 0; }
        .r-item-name { font-size: 13px; font-weight: 600; }
        .r-item-sub  { display: flex; justify-content: space-between; font-size: 12px; color: #444; }
        .r-warranty  { font-size: 10px; color: #888; }
        .r-summary   { font-size: 13px; }
        .r-row    { display: flex; justify-content: space-between; margin: 3px 0; }
        .r-total  { font-size: 16px; font-weight: bold; border-top: 1px solid #000; padding-top: 6px; margin-top: 6px; }
        .r-footer { text-align: center; font-size: 10px; color: #666; margin-top: 16px; line-height: 1.6; }
      </style></head><body>${html}</body></html>
    `);
    w.document.close();
    w.print();
  };

  const fmt = (n) =>
    Number(n ?? 0).toLocaleString("en-NG", { minimumFractionDigits: 2 });
  const now = new Date(savedReceipt?.createdAt || Date.now());
  const dateStr = now.toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const receiptItems = Array.isArray(savedReceipt?.items)
    ? savedReceipt.items
    : [];

  // ── Receipt view ──────────────────────────────────────────
  if (savedReceipt) {
    return (
      <motion.div
        className="sell-page"
        variants={pageVariants}
        initial="hidden"
        animate="show"
      >
        <div className="receipt-container">
          <motion.div
            className="receipt-paper"
            ref={printRef}
            variants={sectionVariants}
          >
            <div className="r-header">
              <div className="r-shop">
                ⚡ {user?.shopName || "JaisHeart Gadget"}
              </div>
              {user?.address && <div className="r-addr">{user.address}</div>}
              {user?.phone && <div className="r-addr">Tel: {user.phone}</div>}
            </div>

            <hr className="r-divider" />

            <div className="r-meta">
              <span>Invoice:</span>
              <strong>{savedReceipt.receiptNumber}</strong>
            </div>
            <div className="r-meta">
              <span>Date:</span>
              <span>
                {dateStr} {timeStr}
              </span>
            </div>
            {savedReceipt.customerName && (
              <div className="r-meta">
                <span>Customer:</span>
                <span>{savedReceipt.customerName}</span>
              </div>
            )}
            {savedReceipt.customerPhone && (
              <div className="r-meta">
                <span>Phone:</span>
                <span>{savedReceipt.customerPhone}</span>
              </div>
            )}
            <div className="r-meta">
              <span>Payment:</span>
              <span>{savedReceipt.payMethod}</span>
            </div>

            <hr className="r-divider" />

            {receiptItems.map((item, i) => (
              <div key={i} className="r-item">
                <div className="r-item-name">
                  {(CATEGORY_ICONS[item.category] || "🔸") + " "}
                  {item.brand ? `${item.brand} ` : ""}
                  {item.name}
                </div>
                {item.model && (
                  <div className="r-warranty">Model: {item.model}</div>
                )}
                <div className="r-item-sub">
                  <span>
                    {item.quantity} × ₦{fmt(item.price)}
                  </span>
                  <strong>₦{fmt(item.subtotal)}</strong>
                </div>
                {item.warranty && item.warranty !== "No warranty" && (
                  <div className="r-warranty">Warranty: {item.warranty}</div>
                )}
              </div>
            ))}

            <hr className="r-divider" />

            <div className="r-summary">
              <div className="r-row">
                <span>Subtotal</span>
                <span>₦{fmt(savedReceipt.subtotal)}</span>
              </div>
              {savedReceipt.discount > 0 && (
                <div className="r-row discount-row">
                  <span>Discount</span>
                  <span>-₦{fmt(savedReceipt.discount)}</span>
                </div>
              )}
              {savedReceipt.tax > 0 && (
                <div className="r-row">
                  <span>VAT ({savedReceipt.taxRate}%)</span>
                  <span>₦{fmt(savedReceipt.tax)}</span>
                </div>
              )}
              <div className="r-row r-total">
                <span>TOTAL</span>
                <span>₦{fmt(savedReceipt.total)}</span>
              </div>
            </div>

            <hr className="r-divider" />
            <div className="r-footer">
              Thank you for shopping with us!
              <br />
              Goods sold are not returnable without receipt.
              <br />
              {user?.shopName || "JaisHeart Gadget"} — Your trusted gadget
              partner
            </div>
          </motion.div>

          <motion.div className="receipt-actions" variants={sectionVariants}>
            <button
              className="btn-ghost"
              onClick={() => {
                if (receiptKey) localStorage.removeItem(receiptKey);
                setSavedReceipt(null);
                setCart([]);
                setCustomPrices({});
                setCustomer({ name: "", phone: "" });
                setDiscount(0);
              }}
            >
              ← New Receipt
            </button>
            <button className="btn-primary" onClick={handlePrint}>
              🖨️ Print Receipt
            </button>
            <button className="btn-ghost" onClick={onBack}>
              Gadgets
            </button>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // ── Sell view ─────────────────────────────────────────────
  return (
    <motion.div
      className="sell-page"
      variants={pageVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div className="page-header" variants={sectionVariants}>
        <div>
          <h2>New Receipt</h2>
          <span className="subtitle">Click gadgets to add to cart</span>
        </div>
        <motion.button
          className="btn-ghost"
          onClick={onBack}
          whileTap={{ scale: 0.97 }}
        >
          ← Gadgets
        </motion.button>
      </motion.div>

      <motion.div
        className="sell-layout"
        variants={sectionVariants}
        initial="hidden"
        animate="show"
      >
        {/* Left: Product Grid */}
        <motion.div
          className="products-panel"
          variants={sectionVariants}
          initial="hidden"
          animate="show"
        >
          <div className="sell-toolbar">
            <input
              className="search-input"
              placeholder="🔍 Search gadgets…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="cat-pills" style={{ marginBottom: 16 }}>
            {categories.map((c) => (
              <motion.button
                key={c}
                className={`pill ${catFilter === c ? "active" : ""}`}
                onClick={() => setCatFilter(c)}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
              >
                {CATEGORY_ICONS[c] || ""} {c}
              </motion.button>
            ))}
          </div>
          <motion.div className="product-grid" variants={listVariants}>
            {filtered.map((p) => (
              <motion.div
                layout
                key={p._id}
                className="product-tile"
                onClick={() => addToCart(p)}
                variants={itemVariants}
                whileHover={{ y: -3, scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="tile-cat-icon">
                  {CATEGORY_ICONS[p.category] || "⚙️"}
                </div>
                <div className="tile-name">{p.name}</div>
                {p.brand && (
                  <div className="tile-brand">
                    {p.brand} {p.model}
                  </div>
                )}
                <div className="tile-price">
                  ₦{Number(p.price).toLocaleString()}
                </div>
                <div className="tile-stock">{p.quantity} in stock</div>
                <div className="tile-add">+ Add</div>
              </motion.div>
            ))}
            {filtered.length === 0 && (
              <motion.div
                className="empty-state"
                style={{ gridColumn: "1/-1", padding: "40px 0" }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22 }}
              >
                <div className="empty-icon">📦</div>
                <p>No available gadgets</p>
              </motion.div>
            )}
          </motion.div>
        </motion.div>

        {/* Right: Cart */}
        <motion.div
          className="cart-panel"
          variants={sectionVariants}
          initial="hidden"
          animate="show"
        >
          <div className="cart-head">
            <h3>
              Cart{" "}
              {cart.length > 0 && (
                <motion.span
                  key={cart.length}
                  className="cart-badge"
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 420, damping: 22 }}
                >
                  {cart.length}
                </motion.span>
              )}
            </h3>
            <span
              className="discount-icon"
              title="Discount"
              onMouseEnter={() => setDiscountVisible(true)}
              onMouseLeave={() => setDiscountVisible(false)}
            >
              💰
            </span>
          </div>

          {/* Customer info */}
          <motion.div
            className="customer-section"
            variants={sectionVariants}
            initial="hidden"
            animate="show"
          >
            <div className="field-row tight">
              <div className="field">
                <label>Customer Name</label>
                <input
                  placeholder="Optional"
                  value={customer.name}
                  onChange={(e) =>
                    setCustomer((c) => ({ ...c, name: e.target.value }))
                  }
                />
              </div>
              <div className="field">
                <label>Phone</label>
                <input
                  placeholder="080XXXXXXXX"
                  value={customer.phone}
                  onChange={(e) =>
                    setCustomer((c) => ({ ...c, phone: e.target.value }))
                  }
                />
              </div>
            </div>
          </motion.div>

          <AnimatePresence mode="wait" initial={false}>
            {cart.length === 0 ? (
              <motion.div
                key="empty-cart"
                className="empty-cart"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.18 }}
              >
                <div style={{ fontSize: 48 }}>🛒</div>
                <p>Click gadgets to add them here</p>
              </motion.div>
            ) : (
              <motion.div
                key="cart"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.18 }}
              >
                <motion.div className="cart-items" variants={listVariants}>
                  <AnimatePresence initial={false}>
                    {cart.map((item) => (
                      <motion.div
                        key={item._id}
                        className="cart-body"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.18 }}
                      >
                        <div className="cart-item-top">
                          <span className="cart-item-name">{item.name}</span>
                          <button
                            className="remove-btn"
                            onClick={() => removeFromCart(item._id)}
                          >
                            ×
                          </button>
                        </div>
                        {item.brand && (
                          <div className="cart-item-sub">
                            {item.brand} {item.model}
                          </div>
                        )}
                        <div className="cart-item-bottom">
                          <div className="qty-ctrl small">
                            <button
                              onClick={() =>
                                updateQty(item._id, item.sellQty - 1)
                              }
                            >
                              −
                            </button>
                            <input
                              type="number"
                              value={item.sellQty}
                              min={1}
                              onChange={(e) =>
                                updateQty(
                                  item._id,
                                  parseInt(e.target.value) || 1,
                                )
                              }
                            />
                            <button
                              onClick={() =>
                                updateQty(item._id, item.sellQty + 1)
                              }
                            >
                              +
                            </button>
                          </div>
                          <div className="price-input-group">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={
                                customPrices[item._id] !== undefined
                                  ? customPrices[item._id]
                                  : item.price
                              }
                              onChange={(e) =>
                                setCustomPrices((prev) => ({
                                  ...prev,
                                  [item._id]:
                                    Number(e.target.value) || item.price,
                                }))
                              }
                              className="price-input"
                              placeholder="Price"
                              title="Click to change price"
                            />
                          </div>
                          <span className="cart-subtotal">
                            ₦
                            {fmt(
                              (customPrices[item._id] !== undefined
                                ? customPrices[item._id]
                                : item.price) * item.sellQty,
                            )}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>

                <motion.div
                  className="cart-summary"
                  variants={sectionVariants}
                  initial="hidden"
                  animate="show"
                >
                  <div className="summary-row">
                    <span>Subtotal</span>
                    <span>₦{fmt(subtotal)}</span>
                  </div>

                  <div className="discount-input-container">
                    {discountVisible && (
                      <div className="summary-input-row discount-row">
                        <label>Discount (₦)</label>
                        <input
                          type="number"
                          min="0"
                          value={discount}
                          onChange={(e) => setDiscount(Number(e.target.value))}
                        />
                      </div>
                    )}
                  </div>
                  {discountAmt > 0 && (
                    <div className="summary-row discount">
                      <span>Discount</span>
                      <span>-₦{fmt(discountAmt)}</span>
                    </div>
                  )}

                  <div className="summary-input-row">
                    <label>VAT %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={taxRate}
                      onChange={(e) => setTaxRate(Number(e.target.value))}
                    />
                  </div>
                  {taxAmt > 0 && (
                    <div className="summary-row">
                      <span>VAT ({taxRate}%)</span>
                      <span>₦{fmt(taxAmt)}</span>
                    </div>
                  )}

                  <div className="summary-input-row">
                    <label>Payment</label>
                    <select
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value)}
                    >
                      {PAY_METHODS.map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div className="cart-total">
                    <span>TOTAL</span>
                    <span>₦{fmt(total)}</span>
                  </div>

                  <motion.button
                    className="btn-primary full-w"
                    onClick={handleGenerate}
                    disabled={loading}
                    whileHover={loading ? undefined : { y: -1 }}
                    whileTap={loading ? undefined : { scale: 0.99 }}
                  >
                    {loading ? "Generating…" : "🧾 Generate Receipt"}
                  </motion.button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default SellPage;
