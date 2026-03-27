const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const MONGO_URI  = process.env.MONGO_URI  || 'mongodb://localhost:27017/techstoredb';
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret_in_production';
const PORT       = process.env.PORT       || 5000;

// ─── Schemas ──────────────────────────────────────────────
const UserSchema = new mongoose.Schema({
  username:  { type: String, required: true, unique: true },
  password:  { type: String, required: true },
  shopName:  { type: String, default: process.env.SHOP_NAME || 'JaisHeart Gadget' },
  address:   { type: String, default: '' },
  phone:     { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

const ProductSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:        { type: String, required: true },
  brand:       { type: String, default: '' },
  model:       { type: String, default: '' },
  category:    { type: String, default: 'Phones' },
  sku:         { type: String, default: '' },
  price:       { type: Number, required: true },
  costPrice:   { type: Number, default: 0 },
  quantity:    { type: Number, required: true, default: 0 },
  warranty:    { type: String, default: '1 year' },
  description: { type: String, default: '' },
  createdAt:   { type: Date, default: Date.now },
  updatedAt:   { type: Date, default: Date.now }
});

const ReceiptSchema = new mongoose.Schema({
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiptNumber: { type: String, required: true },
  customerName:  { type: String, default: '' },
  customerPhone: { type: String, default: '' },
  items: [{
    productId: mongoose.Schema.Types.ObjectId,
    name:      String,
    brand:     String,
    model:     String,
    price:     Number,
    quantity:  Number,
    subtotal:  Number,
    warranty:  String
  }],
  subtotal:  Number,
  discount:  { type: Number, default: 0 },
  tax:       Number,
  taxRate:   { type: Number, default: 0 },
  total:     Number,
  payMethod: { type: String, default: 'Cash' },
  createdAt: { type: Date, default: Date.now }
});

const User    = mongoose.model('User',    UserSchema);
const Product = mongoose.model('Product', ProductSchema);
const Receipt = mongoose.model('Receipt', ReceiptSchema);

// ─── DB Connect + Admin Bootstrap ─────────────────────────
const ensureAdminUser = async () => {
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminUsername || !adminPassword) return;

  const shopName = process.env.SHOP_NAME || 'JaisHeart Gadget';
  const address  = process.env.SHOP_ADDRESS || '';
  const phone    = process.env.SHOP_PHONE || '';
  const resetPw  = String(process.env.ADMIN_RESET_PASSWORD || '').toLowerCase() === 'true';

  const existing = await User.findOne({ username: adminUsername });
  if (!existing) {
    const hashed = await bcrypt.hash(adminPassword, 10);
    await User.create({ username: adminUsername, password: hashed, shopName, address, phone });
    console.log(`✅ Admin user created: ${adminUsername}`);
    return;
  }

  const shouldReset = resetPw && !(await bcrypt.compare(adminPassword, existing.password));
  if (shouldReset) {
    existing.password = await bcrypt.hash(adminPassword, 10);
    console.log(`✅ Admin password updated: ${adminUsername}`);
  }

  existing.shopName = shopName;
  existing.address = address;
  existing.phone = phone;

  if (shouldReset || existing.isModified()) await existing.save();
};

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB connected');
    await ensureAdminUser();
  })
  .catch(err => console.error('❌ MongoDB error:', err));

// ─── Auth Middleware ──────────────────────────────────────
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    const d = jwt.verify(token, JWT_SECRET);
    req.userId = d.userId;
    next();
  } catch { res.status(401).json({ message: 'Invalid token' }); }
};

// ─── Auth Routes ──────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  const allowRegister = String(process.env.ALLOW_REGISTER || '').toLowerCase() === 'true';
  if (!allowRegister) return res.status(403).json({ message: 'Registration is disabled' });
  try {
    const { username, password, shopName, address, phone } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Username and password required' });
    if (await User.findOne({ username })) return res.status(400).json({ message: 'Username already taken' });
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hashed, shopName: shopName || (process.env.SHOP_NAME || 'JaisHeart Gadget'), address: address || '', phone: phone || '' });
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, username: user.username, shopName: user.shopName, address: user.address, phone: user.phone } });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(400).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, username: user.username, shopName: user.shopName, address: user.address, phone: user.phone } });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Products Routes ──────────────────────────────────────
app.get('/api/products', auth, async (req, res) => {
  res.json(await Product.find({ userId: req.userId }).sort({ createdAt: -1 }));
});

app.post('/api/products', auth, async (req, res) => {
  try { res.json(await Product.create({ userId: req.userId, ...req.body })); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

app.put('/api/products/:id', auth, async (req, res) => {
  try {
    const p = await Product.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    if (!p) return res.status(404).json({ message: 'Not found' });
    res.json(p);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.delete('/api/products/:id', auth, async (req, res) => {
  try {
    await Product.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Receipt Routes ───────────────────────────────────────
app.post('/api/receipts', auth, async (req, res) => {
  try {
    const count = await Receipt.countDocuments({ userId: req.userId });
    const receiptNumber = `INV-${String(count + 1).padStart(5, '0')}`;
    const receipt = await Receipt.create({ userId: req.userId, receiptNumber, ...req.body });
    res.json(receipt);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/receipts', auth, async (req, res) => {
  res.json(await Receipt.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(100));
});

// ─── Dashboard Stats ──────────────────────────────────────
app.get('/api/stats', auth, async (req, res) => {
  const [products, receipts] = await Promise.all([
    Product.find({ userId: req.userId }),
    Receipt.find({ userId: req.userId })
  ]);
  res.json({
    totalItems:     products.length,
    totalStock:     products.reduce((s, p) => s + p.quantity, 0),
    inventoryValue: products.reduce((s, p) => s + p.price * p.quantity, 0),
    totalSales:     receipts.reduce((s, r) => s + r.total, 0),
    lowStock:       products.filter(p => p.quantity < 3).length,
    totalReceipts:  receipts.length
  });
});

app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
