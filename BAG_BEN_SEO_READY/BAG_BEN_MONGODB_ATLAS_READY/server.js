require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'bagben-admin-2026';
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || 'bagben';

const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, 'data', 'store.json');
const UPLOAD_DIR = path.join(ROOT, 'uploads');

fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const defaultStore = {
  settings: {
    storeName: 'BAG BEN',
    deliveryPhone: '03217342487',
    currency: 'Rs.'
  },
  products: [],
  orders: []
};

const client = new MongoClient(MONGODB_URI || 'mongodb://127.0.0.1:27017');
let db;
let products;
let orders;
let settings;
let meta;

function localStore() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(defaultStore, null, 2));
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (err) {
    console.error('Could not read local store.json:', err.message);
    return structuredClone(defaultStore);
  }
}

async function seedFromLocalFileIfNeeded() {
  const alreadySeeded = await meta.findOne({ _id: 'local-store-imported-v1' });
  if (alreadySeeded) return;

  const local = localStore();
  const productCount = await products.countDocuments();
  const orderCount = await orders.countDocuments();
  const settingsDoc = await settings.findOne({ _id: 'settings' });

  if (productCount === 0 && Array.isArray(local.products) && local.products.length) {
    const docs = local.products.map(p => ({ ...p }));
    await products.insertMany(docs, { ordered: false });
    console.log(`Imported ${docs.length} existing products from data/store.json.`);
  }

  if (orderCount === 0 && Array.isArray(local.orders) && local.orders.length) {
    await orders.insertMany(local.orders.map(o => ({ ...o })), { ordered: false });
    console.log(`Imported ${local.orders.length} existing orders from data/store.json.`);
  }

  if (!settingsDoc) {
    await settings.replaceOne({ _id: 'settings' }, {
      _id: 'settings',
      ...(local.settings || defaultStore.settings)
    }, { upsert: true });
  }

  await meta.insertOne({ _id: 'local-store-imported-v1', importedAt: new Date() });
}

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safe = path.basename(file.originalname, ext)
      .replace(/[^a-z0-9-_]/gi, '-')
      .slice(0, 60);
    cb(null, `${Date.now()}-${safe || 'bag'}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const ok = /image\/(png|jpe?g|webp)/i.test(file.mimetype);
    cb(ok ? null : new Error('Only JPG, PNG and WebP images are allowed.'), ok);
  }
});

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOAD_DIR));

/* SEO files: generated dynamically so they work on Railway, Abasthan,
   or a future custom domain without changing the code. */
app.get('/robots.txt', (req, res) => {
 const base = `https://${req.get('host')}`;
  res.type('text/plain').send(
`User-agent: *
Allow: /
Disallow: /admin.html
Disallow: /api/
Disallow: /data/
Sitemap: ${base}/sitemap.xml
`
  );
});

app.get('/sitemap.xml', (req, res) => {
 const base = `https://${req.get('host')}`;
  const now = new Date().toISOString().split('T')[0];
  res.type('application/xml').send(
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${base}/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`
  );
});

// Never expose database files through the public static folder.
app.use('/data', (_, res) => res.status(404).json({ error: 'Not found.' }));
app.use(express.static(ROOT, { dotfiles: 'ignore' }));

function adminOnly(req, res, next) {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (key !== ADMIN_KEY) return res.status(401).json({ error: 'Invalid admin key.' });
  next();
}

function cleanProduct(p) {
  if (!p) return p;
  const { _id, ...rest } = p;
  return rest;
}

function cleanSettings(s) {
  if (!s) return defaultStore.settings;
  const { _id, ...rest } = s;
  return rest;
}

app.get('/api/health', async (_, res) => {
  try {
    await db.command({ ping: 1 });
    res.json({ ok: true, database: DB_NAME, storage: 'MongoDB Atlas' });
  } catch (err) {
    res.status(503).json({ ok: false, error: 'Database unavailable.' });
  }
});

app.get('/api/store', async (_, res, next) => {
  try {
    const [settingsDoc, productDocs, orderDocs] = await Promise.all([
      settings.findOne({ _id: 'settings' }),
      products.find({}).sort({ createdAt: -1 }).toArray(),
      orders.find({}).sort({ createdAt: -1 }).toArray()
    ]);
    res.json({
      settings: cleanSettings(settingsDoc),
      products: productDocs.map(cleanProduct),
      orders: orderDocs.map(cleanProduct)
    });
  } catch (err) { next(err); }
});

app.get('/api/products', async (_, res, next) => {
  try {
    const docs = await products.find({}).sort({ createdAt: -1 }).toArray();
    res.json(docs.map(cleanProduct));
  } catch (err) { next(err); }
});

app.post('/api/products', adminOnly, upload.single('image'), async (req, res, next) => {
  try {
    const { name, price, description, category, rating, stock } = req.body;
    if (!name || !price || !description) {
      return res.status(400).json({ error: 'Name, price and description are required.' });
    }

    const product = {
      id: 'p_' + Date.now(),
      name: String(name).trim(),
      price: Number(price),
      description: String(description).trim(),
      category: String(category || 'Fashion').trim(),
      rating: Number(rating || 5),
      stock: Math.max(0, Number(stock ?? 10)),
      image: req.file ? `/uploads/${req.file.filename}` : '',
      createdAt: new Date().toISOString()
    };

    await products.insertOne(product);
    res.status(201).json(product);
  } catch (err) { next(err); }
});

app.put('/api/products/:id', adminOnly, upload.single('image'), async (req, res, next) => {
  try {
    const product = await products.findOne({ id: req.params.id });
    if (!product) return res.status(404).json({ error: 'Product not found.' });

    const update = {};
    if (req.body.name !== undefined) update.name = String(req.body.name).trim();
    if (req.body.price !== undefined) update.price = Number(req.body.price);
    if (req.body.description !== undefined) update.description = String(req.body.description).trim();
    if (req.body.category !== undefined) update.category = String(req.body.category).trim();
    if (req.body.rating !== undefined) update.rating = Number(req.body.rating);
    if (req.body.stock !== undefined) update.stock = Math.max(0, Number(req.body.stock));

    if (req.file) {
      if (product.image && product.image.startsWith('/uploads/')) {
        const oldFile = path.join(ROOT, product.image.replace(/^\/+/, ''));
        if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
      }
      update.image = `/uploads/${req.file.filename}`;
    }

    update.updatedAt = new Date().toISOString();
    await products.updateOne({ id: req.params.id }, { $set: update });
    res.json(cleanProduct({ ...product, ...update }));
  } catch (err) { next(err); }
});

app.delete('/api/products/:id', adminOnly, async (req, res, next) => {
  try {
    const product = await products.findOne({ id: req.params.id });
    if (!product) return res.status(404).json({ error: 'Product not found.' });

    await products.deleteOne({ id: req.params.id });

    if (product.image && product.image.startsWith('/uploads/')) {
      const file = path.join(ROOT, product.image.replace(/^\/+/, ''));
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }

    res.json({ success: true });
  } catch (err) { next(err); }
});

app.put('/api/settings', adminOnly, async (req, res, next) => {
  try {
    const current = await settings.findOne({ _id: 'settings' }) || { ...defaultStore.settings };
    const nextSettings = {
      _id: 'settings',
      storeName: String(req.body.storeName || current.storeName || defaultStore.settings.storeName),
      deliveryPhone: String(req.body.deliveryPhone || current.deliveryPhone || defaultStore.settings.deliveryPhone),
      currency: String(req.body.currency || current.currency || defaultStore.settings.currency)
    };
    await settings.replaceOne({ _id: 'settings' }, nextSettings, { upsert: true });
    res.json(cleanSettings(nextSettings));
  } catch (err) { next(err); }
});

app.post('/api/orders', async (req, res, next) => {
  const session = client.startSession();
  try {
    const { customerName, phone, address, items } = req.body;
    if (!customerName || !phone || !address || !Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: 'Customer details and cart items are required.' });
    }

    let createdOrder;
    await session.withTransaction(async () => {
      const orderItems = [];
      for (const item of items) {
        const p = await products.findOne({ id: item.id }, { session });
        if (!p) continue;
        const qty = Math.max(1, Number(item.qty) || 1);
        const stock = Number(p.stock ?? 0);
        if (stock < qty) throw new Error(`${p.name} has only ${stock} item(s) in stock.`);
        orderItems.push({ id: p.id, name: p.name, price: p.price, qty });
      }
      if (!orderItems.length) throw new Error('No valid products in cart.');

      for (const item of orderItems) {
        const result = await products.updateOne(
          { id: item.id, stock: { $gte: item.qty } },
          { $inc: { stock: -item.qty } },
          { session }
        );
        if (result.modifiedCount !== 1) throw new Error('Stock changed while placing the order. Please try again.');
      }

      const total = orderItems.reduce((sum, item) => sum + item.price * item.qty, 0);
      createdOrder = {
        id: 'BB-' + Date.now().toString().slice(-8),
        customerName: String(customerName).trim(),
        phone: String(phone).trim(),
        address: String(address).trim(),
        items: orderItems,
        total,
        status: 'New',
        createdAt: new Date().toISOString()
      };
      await orders.insertOne(createdOrder, { session });
    });

    res.status(201).json(createdOrder);
  } catch (err) {
    next(err);
  } finally {
    await session.endSession();
  }
});

app.get('/api/orders', adminOnly, async (_, res, next) => {
  try {
    const docs = await orders.find({}).sort({ createdAt: -1 }).toArray();
    res.json(docs.map(cleanProduct));
  } catch (err) { next(err); }
});

app.put('/api/orders/:id', adminOnly, async (req, res, next) => {
  try {
    const allowed = ['New', 'Processing', 'Shipped', 'Completed', 'Cancelled'];
    if (!allowed.includes(req.body.status)) return res.status(400).json({ error: 'Invalid order status.' });
    const result = await orders.findOneAndUpdate(
      { id: req.params.id },
      { $set: { status: req.body.status } },
      { returnDocument: 'after' }
    );
    if (!result) return res.status(404).json({ error: 'Order not found.' });
    res.json(cleanProduct(result));
  } catch (err) { next(err); }
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(400).json({ error: err.message || 'Something went wrong.' });
});

async function start() {
  if (!MONGODB_URI) {
    console.error('\nMONGODB_URI is missing. Create a .env file containing your Atlas connection string.\n');
    process.exit(1);
  }

  try {
    await client.connect();
    db = client.db(DB_NAME);
    products = db.collection('products');
    orders = db.collection('orders');
    settings = db.collection('settings');
    meta = db.collection('_meta');

    await Promise.all([
      products.createIndex({ id: 1 }, { unique: true }),
      orders.createIndex({ id: 1 }, { unique: true }),
      products.createIndex({ category: 1 }),
      orders.createIndex({ createdAt: -1 })
    ]);

    await seedFromLocalFileIfNeeded();
    await settings.updateOne(
      { _id: 'settings' },
      { $setOnInsert: { ...defaultStore.settings } },
      { upsert: true }
    );

    app.listen(PORT, () => {
      console.log(`BAG BEN running at http://localhost:${PORT}`);
      console.log(`Admin dashboard: http://localhost:${PORT}/admin.html`);
      console.log(`MongoDB database: ${DB_NAME}`);
      console.log('MongoDB connection: OK');
    });
  } catch (err) {
    console.error('\nMongoDB connection failed.');
    console.error(err.message);
    process.exit(1);
  }
}

start();
