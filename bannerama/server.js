import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3001;
const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const DATA_DIR = path.join(__dirname, 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

const MAX_UPLOAD_BYTES = 250 * 1024 * 1024; // 250 MB, large-format PDFs get big
const ARTWORK_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.tif', '.tiff', '.ai', '.eps', '.svg'];

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.ico': 'image/x-icon'
};

// Prices in GBP. PVC and mesh are per square metre, roller banners are per unit.
const PRICING = {
  pvc: { perSqm: 14, minCharge: 25 },
  mesh: { perSqm: 18, minCharge: 30 },
  roller: { sizes: { '850x2000': 59, '1000x2000': 79, '1200x2000': 99 }, premiumStand: 25 },
  finishing: { eyelets: 0, scaffold: 6, hemmed: 0 }, // scaffold pockets priced per metre of pocket
  cableTies: 4 // per pack of 10
};

function initializeData() {
  for (const dir of [UPLOAD_DIR, DATA_DIR]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(ORDERS_FILE)) fs.writeFileSync(ORDERS_FILE, '[]', 'utf-8');
}

function readOrders() {
  try {
    return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf-8'));
  } catch (err) {
    console.error('Error reading orders:', err);
    return [];
  }
}

function saveOrders(orders) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) {
        req.socket.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sendResponse(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// Recalculate the price on the server so the browser total can't be tampered with
function quote(order) {
  const qty = Math.max(1, Math.min(500, parseInt(order.quantity, 10) || 1));
  let unit;

  if (order.type === 'roller') {
    const base = PRICING.roller.sizes[order.size];
    if (!base) throw new Error('Unknown roller banner size');
    unit = base + (order.stand === 'premium' ? PRICING.roller.premiumStand : 0);
  } else if (order.type === 'pvc' || order.type === 'mesh') {
    const w = Number(order.widthCm), h = Number(order.heightCm);
    if (!(w >= 30 && w <= 2000 && h >= 30 && h <= 500)) throw new Error('Banner size out of range');
    const rates = PRICING[order.type];
    const area = (w / 100) * (h / 100);
    unit = Math.max(rates.minCharge, area * rates.perSqm);
    if (!(order.finishing in PRICING.finishing)) throw new Error('Unknown finishing option');
    if (order.finishing === 'scaffold') {
      const pocketMetres = (order.pocketEdges === 'all' ? 2 * (w + h) : order.pocketEdges === 'sides' ? 2 * h : 2 * w) / 100;
      unit += pocketMetres * PRICING.finishing.scaffold;
    }
    if (order.cableTies) unit += PRICING.cableTies * Math.ceil(2 * (w + h) / 50 / 10);
  } else {
    throw new Error('Unknown banner type');
  }

  const subtotal = Math.round(unit * qty * 100) / 100;
  const vat = Math.round(subtotal * 0.2 * 100) / 100;
  return { quantity: qty, unitPrice: Math.round(unit * 100) / 100, subtotal, vat, total: Math.round((subtotal + vat) * 100) / 100 };
}

// Artwork arrives as the raw request body, with the original filename in a header
function handleArtworkUpload(req, res) {
  const originalName = decodeURIComponent(req.headers['x-filename'] || '');
  const ext = path.extname(originalName).toLowerCase();
  if (!ARTWORK_EXTENSIONS.includes(ext)) {
    return sendResponse(res, 400, { error: `File type not accepted. Use ${ARTWORK_EXTENSIONS.join(', ')}` });
  }
  if (Number(req.headers['content-length']) > MAX_UPLOAD_BYTES) {
    return sendResponse(res, 413, { error: 'File is larger than 250 MB' });
  }

  const id = crypto.randomUUID();
  const safeName = path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = path.join(UPLOAD_DIR, `${id}-${safeName}`);
  const out = fs.createWriteStream(filePath);
  let received = 0;

  req.on('data', chunk => {
    received += chunk.length;
    if (received > MAX_UPLOAD_BYTES) {
      req.unpipe(out);
      out.destroy();
      fs.rm(filePath, () => {});
      sendResponse(res, 413, { error: 'File is larger than 250 MB' });
      req.socket.destroy();
    }
  });
  req.pipe(out);
  out.on('finish', () => {
    if (!res.writableEnded) sendResponse(res, 201, { id, name: originalName, size: received });
  });
  out.on('error', () => sendResponse(res, 500, { error: 'Could not save file' }));
}

function findArtwork(id) {
  if (!/^[0-9a-f-]{36}$/.test(id || '')) return null;
  return fs.readdirSync(UPLOAD_DIR).find(f => f.startsWith(id + '-')) || null;
}

function serveStaticFile(res, reqPath) {
  const safePath = reqPath === '/' ? '/index.html' : reqPath;
  const normalizedPath = path.normalize(safePath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, normalizedPath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not Found');
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const method = req.method;

  if (method === 'GET' && pathname === '/api/pricing') {
    return sendResponse(res, 200, PRICING);
  }

  if (method === 'POST' && pathname === '/api/artwork') {
    return handleArtworkUpload(req, res);
  }

  // Artwork uploaded on the products page is picked up again by the order form
  const artMatch = pathname.match(/^\/api\/artwork\/([0-9a-f-]{36})(\/preview)?$/);
  if (method === 'GET' && artMatch) {
    const file = findArtwork(artMatch[1]);
    if (!file) return sendResponse(res, 404, { error: 'Artwork not found' });
    const filePath = path.join(UPLOAD_DIR, file);
    if (!artMatch[2]) {
      return sendResponse(res, 200, { id: artMatch[1], name: file.slice(37), size: fs.statSync(filePath).size });
    }
    // Previews only for raster images, so an uploaded SVG or PDF is never rendered from our domain
    const type = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' }[path.extname(file).toLowerCase()];
    if (!type) return sendResponse(res, 404, { error: 'No preview for this file type' });
    res.writeHead(200, { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff' });
    return fs.createReadStream(filePath).pipe(res);
  }

  if (method === 'POST' && pathname === '/api/quote') {
    try {
      return sendResponse(res, 200, quote(await parseJsonBody(req)));
    } catch (err) {
      return sendResponse(res, 400, { error: err.message });
    }
  }

  if (method === 'POST' && pathname === '/api/orders') {
    try {
      const body = await parseJsonBody(req);
      const customer = body.customer || {};
      if (!customer.name?.trim() || !/^\S+@\S+\.\S+$/.test(customer.email || '')) {
        return sendResponse(res, 400, { error: 'Please give your name and a valid email' });
      }
      const artworkFile = findArtwork(body.artworkId);
      if (!artworkFile) return sendResponse(res, 400, { error: 'Please upload your artwork first' });

      const order = {
        id: 'BNR-' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        createdAt: new Date().toISOString(),
        status: 'awaiting-artwork-check',
        type: body.type,
        size: body.type === 'roller' ? body.size : `${body.widthCm}x${body.heightCm}cm`,
        stand: body.type === 'roller' ? body.stand : undefined,
        finishing: body.type === 'roller' ? undefined : body.finishing,
        pocketEdges: body.finishing === 'scaffold' ? body.pocketEdges : undefined,
        cableTies: body.type === 'roller' ? undefined : Boolean(body.cableTies),
        artworkFile,
        notes: String(body.notes || '').slice(0, 2000),
        customer: {
          name: customer.name.trim(),
          email: customer.email.trim(),
          phone: String(customer.phone || '').trim()
        },
        price: quote(body)
      };

      const orders = readOrders();
      orders.unshift(order);
      saveOrders(orders);
      return sendResponse(res, 201, order);
    } catch (err) {
      return sendResponse(res, 400, { error: err.message });
    }
  }

  if (pathname.startsWith('/api/')) return sendResponse(res, 404, { error: 'API route not found' });

  serveStaticFile(res, pathname);
});

initializeData();

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Bannerama is running at http://localhost:${PORT}`);
});
