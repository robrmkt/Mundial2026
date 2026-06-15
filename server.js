import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const distDir = resolve(__dirname, 'dist');
const dataDir = process.env.DATA_DIR || resolve(__dirname, 'data');
const stateFile = resolve(dataDir, 'shared-state.json');
const port = Number(process.env.PORT) || 4173;

const defaultState = {
  participants: [],
  documents: [],
  updatedAt: null
};

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function ensureDataFile() {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  if (!existsSync(stateFile)) {
    writeFileSync(stateFile, JSON.stringify(defaultState, null, 2));
  }
}

function readState() {
  ensureDataFile();
  try {
    const parsed = JSON.parse(readFileSync(stateFile, 'utf8'));
    return {
      participants: Array.isArray(parsed.participants) ? parsed.participants : [],
      documents: Array.isArray(parsed.documents) ? parsed.documents : [],
      updatedAt: parsed.updatedAt || null
    };
  } catch (error) {
    console.error('Unable to read shared state:', error);
    return defaultState;
  }
}

function writeState(nextState) {
  ensureDataFile();
  const state = {
    participants: Array.isArray(nextState.participants) ? nextState.participants : [],
    documents: Array.isArray(nextState.documents) ? nextState.documents : [],
    updatedAt: new Date().toISOString()
  };
  writeFileSync(stateFile, JSON.stringify(state, null, 2));
  return state;
}

function readBody(request) {
  return new Promise((resolveBody, rejectBody) => {
    let body = '';
    request.on('data', chunk => {
      body += chunk;
      if (body.length > 1_000_000) {
        request.destroy();
        rejectBody(new Error('Payload too large'));
      }
    });
    request.on('end', () => resolveBody(body));
    request.on('error', rejectBody);
  });
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  response.end(JSON.stringify(payload));
}

function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const requestedPath = normalize(decodeURIComponent(url.pathname));
  const filePath = requestedPath === '/'
    ? join(distDir, 'index.html')
    : resolve(distDir, `.${requestedPath}`);

  if (!filePath.startsWith(distDir) || !existsSync(filePath)) {
    const fallback = join(distDir, 'index.html');
    response.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache'
    });
    createReadStream(fallback).pipe(response);
    return;
  }

  response.writeHead(200, {
    'Content-Type': contentTypes[extname(filePath)] || 'application/octet-stream'
  });
  createReadStream(filePath).pipe(response);
}

const server = createServer(async (request, response) => {
  try {
    if (request.url?.startsWith('/api/state')) {
      if (request.method === 'GET') {
        sendJson(response, 200, readState());
        return;
      }

      if (request.method === 'PUT') {
        const body = await readBody(request);
        const parsed = JSON.parse(body || '{}');
        sendJson(response, 200, writeState({ ...readState(), ...parsed }));
        return;
      }

      sendJson(response, 405, { error: 'Method not allowed' });
      return;
    }

    serveStatic(request, response);
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { error: 'Internal server error' });
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Quiniela server listening on ${port}`);
});
