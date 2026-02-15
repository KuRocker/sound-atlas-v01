/**
 * SOUNDATLAS Server Entry Point
 * Express + WebSocket server on port 3001
 * Ported from HATA-ANALİZ-PROJESİ server.js
 */

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { loadReferenceMetadata, faultSoundsDir, uploadsDir, referenceDir } from './state.js';
import { checkReconnect } from './esp32.js';
import { setupWebSocketHandler } from './ws/handler.js';
import { createEsp32Routes } from './routes/esp32.js';
import { createReferencesRoutes } from './routes/references.js';
import { createAnalysisRoutes } from './routes/analysis.js';
import { createFaultSoundsRoutes } from './routes/fault-sounds.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// Ensure directories exist
[faultSoundsDir, uploadsDir, referenceDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const app = express();
app.use(cors());
app.use(express.json());

// Multer storage config
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, faultSoundsDir),
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `sound_${timestamp}${ext}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = ['.wav', '.mp3', '.ogg', '.m4a'];
    cb(null, allowed.includes(ext));
  },
  limits: { fileSize: 300 * 1024 * 1024 }
});

// Mount routes
app.use('/api/esp32', createEsp32Routes());
app.use('/api', createReferencesRoutes());
app.use('/api/analysis', createAnalysisRoutes());
app.use('/api/fault-sounds', createFaultSoundsRoutes(upload as any));
app.use('/fault-sounds', express.static(faultSoundsDir));

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true, uptime: process.uptime() }));

// Production mode: serve built frontend
if (process.env.NODE_ENV === 'production') {
  const distDir = path.join(__dirname, '..', 'dist');
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }
}

// Create HTTP server
const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });
setupWebSocketHandler(wss);

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// Start server
server.listen(PORT, HOST, async () => {
  await loadReferenceMetadata();
  console.log('='.repeat(60));
  console.log('SOUNDATLAS server started');
  console.log(`HTTP: http://${HOST}:${PORT}`);
  console.log(`WS:   ws://${HOST}:${PORT}`);
  console.log('='.repeat(60));
});

// ESP32 auto-reconnect timer (5s interval)
setInterval(() => { checkReconnect(); }, 5000);
