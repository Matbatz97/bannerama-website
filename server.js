import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'todos.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

// MIME types for static files
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Ensure data directory and file exist with initial sample tasks
function initializeData() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    const initialTodos = [
      {
        id: crypto.randomUUID(),
        title: 'Welcome to your simple To-Do app! 👋',
        completed: false,
        createdAt: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        title: 'Click the circle to mark this task complete',
        completed: true,
        createdAt: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        title: 'Try adding a new task using the input above',
        completed: false,
        createdAt: new Date().toISOString()
      }
    ];
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialTodos, null, 2), 'utf-8');
  }
}

function readTodos() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading todos:', err);
    return [];
  }
}

function saveTodos(todos) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(todos, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error saving todos:', err);
    return false;
  }
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
        const parsed = JSON.parse(body);
        resolve(parsed);
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sendResponse(res, statusCode, data, isJson = true) {
  if (isJson) {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(data));
  } else {
    res.writeHead(statusCode);
    res.end(data);
  }
}

// Serve static files
function serveStaticFile(res, reqPath) {
  let safePath = reqPath === '/' ? '/index.html' : reqPath;
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
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = urlObj.pathname;
  const method = req.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  // API Routes
  if (pathname.startsWith('/api/todos')) {
    // GET /api/todos
    if (method === 'GET' && (pathname === '/api/todos' || pathname === '/api/todos/')) {
      const todos = readTodos();
      return sendResponse(res, 200, todos);
    }

    // POST /api/todos
    if (method === 'POST' && (pathname === '/api/todos' || pathname === '/api/todos/')) {
      try {
        const body = await parseJsonBody(req);
        const title = (body.title || '').trim();

        if (!title) {
          return sendResponse(res, 400, { error: 'Task title is required' });
        }

        const newTodo = {
          id: crypto.randomUUID(),
          title: title,
          completed: false,
          createdAt: new Date().toISOString()
        };

        const todos = readTodos();
        todos.unshift(newTodo);
        saveTodos(todos);

        return sendResponse(res, 201, newTodo);
      } catch (err) {
        return sendResponse(res, 400, { error: err.message });
      }
    }

    // DELETE /api/todos/completed (clear all completed tasks)
    if (method === 'DELETE' && pathname === '/api/todos/completed') {
      const todos = readTodos();
      const remainingTodos = todos.filter(t => !t.completed);
      saveTodos(remainingTodos);
      return sendResponse(res, 200, {
        message: 'Completed tasks cleared',
        clearedCount: todos.length - remainingTodos.length
      });
    }

    // PATCH /api/todos/:id
    const matchPatch = pathname.match(/^\/api\/todos\/([a-zA-Z0-9_-]+)$/);
    if (method === 'PATCH' && matchPatch) {
      const todoId = matchPatch[1];
      try {
        const body = await parseJsonBody(req);
        const todos = readTodos();
        const index = todos.findIndex(t => t.id === todoId);

        if (index === -1) {
          return sendResponse(res, 404, { error: 'Task not found' });
        }

        if (typeof body.completed === 'boolean') {
          todos[index].completed = body.completed;
        }

        if (typeof body.title === 'string' && body.title.trim().length > 0) {
          todos[index].title = body.title.trim();
        }

        todos[index].updatedAt = new Date().toISOString();
        saveTodos(todos);

        return sendResponse(res, 200, todos[index]);
      } catch (err) {
        return sendResponse(res, 400, { error: err.message });
      }
    }

    // DELETE /api/todos/:id
    const matchDelete = pathname.match(/^\/api\/todos\/([a-zA-Z0-9_-]+)$/);
    if (method === 'DELETE' && matchDelete) {
      const todoId = matchDelete[1];
      const todos = readTodos();
      const index = todos.findIndex(t => t.id === todoId);

      if (index === -1) {
        return sendResponse(res, 404, { error: 'Task not found' });
      }

      const deleted = todos.splice(index, 1)[0];
      saveTodos(todos);

      return sendResponse(res, 200, { message: 'Task deleted', id: deleted.id });
    }

    return sendResponse(res, 404, { error: 'API route not found' });
  }

  // Static files handling
  serveStaticFile(res, pathname);
});

// Initialize storage and start server
initializeData();

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
