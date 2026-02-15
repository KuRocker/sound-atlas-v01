/**
 * SOUNDATLAS ESP32 Connection Manager
 * Ported from HATA-ANALİZ-PROJESİ server.js lines 165-255, 791-858
 */

import WebSocket from 'ws';
import { IncomingMessage } from 'http';
import {
  esp32Status, esp32Ip, esp32ConnectionMode,
  setEsp32Ip, setEsp32ConnectionMode
} from './state.js';
import { broadcastToClients } from './ws/handler.js';
import { handleEsp32Telemetry } from './analysis.js';

let esp32Ws: WebSocket | null = null;

function normalizeIp(rawIp: string | null | undefined): string | null {
  if (!rawIp || typeof rawIp !== 'string') return null;
  return rawIp.replace(/^::ffff:/, '');
}

function resolveSocketIp(request: IncomingMessage): string | null {
  const forwarded = request?.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length) {
    return normalizeIp(forwarded.split(',')[0].trim());
  }
  return normalizeIp(request?.socket?.remoteAddress || null);
}

function setEsp32Disconnected(clearIp: boolean = false): void {
  esp32Status.connected = false;
  esp32Status.lastSeen = null;
  setEsp32ConnectionMode('none');
  if (clearIp) setEsp32Ip(null);
  broadcastToClients({ type: 'esp32_disconnected' });
}

export function attachInboundEsp32Socket(ws: WebSocket, request: IncomingMessage): void {
  if (esp32Ws && esp32Ws.readyState === WebSocket.OPEN) {
    try { esp32Ws.close(); } catch (_e) {}
  }

  esp32Ws = ws;
  setEsp32ConnectionMode('inbound');
  setEsp32Ip(resolveSocketIp(request) || esp32Ip);
  esp32Status.connected = true;
  esp32Status.lastSeen = Date.now();
  broadcastToClients({ type: 'esp32_connected', ip: esp32Ip });
  sendToESP32({ cmd: 'get_status' });
  sendToESP32({ cmd: 'get_settings' });

  ws.on('message', (message) => {
    if (esp32Ws !== ws) return;
    try {
      const telemetry = JSON.parse(message.toString());
      handleEsp32Telemetry(telemetry);
    } catch (err: any) {
      console.error('ESP32 inbound message parse error:', err.message);
    }
  });

  ws.on('close', () => {
    if (esp32Ws !== ws) return;
    esp32Ws = null;
    setEsp32Disconnected(false);
  });

  ws.on('error', (err: any) => {
    if (esp32Ws !== ws) return;
    console.error('ESP32 inbound ws error:', err.message);
    esp32Ws = null;
    setEsp32Disconnected(false);
  });
}

export function connectToESP32(ip: string): void {
  if (!ip) return;
  if (
    esp32ConnectionMode === 'inbound' &&
    esp32Ws &&
    esp32Ws.readyState === WebSocket.OPEN &&
    esp32Ip === ip
  ) {
    broadcastToClients({ type: 'esp32_connected', ip: esp32Ip });
    return;
  }
  if (esp32Ws && esp32Ws.readyState === WebSocket.OPEN) {
    try { esp32Ws.close(); } catch (_e) {}
  }

  setEsp32ConnectionMode('outbound');
  setEsp32Ip(ip);
  esp32Ws = new WebSocket(`ws://${ip}/ws`);
  const activeSocket = esp32Ws;

  activeSocket.on('open', () => {
    if (esp32Ws !== activeSocket) return;
    esp32Status.connected = true;
    esp32Status.lastSeen = Date.now();
    broadcastToClients({ type: 'esp32_connected', ip: esp32Ip });
    sendToESP32({ cmd: 'get_status' });
    sendToESP32({ cmd: 'get_settings' });
  });

  activeSocket.on('message', (message) => {
    if (esp32Ws !== activeSocket) return;
    try {
      const telemetry = JSON.parse(message.toString());
      handleEsp32Telemetry(telemetry);
    } catch (err: any) {
      console.error('ESP32 message parse error:', err.message);
    }
  });

  activeSocket.on('close', () => {
    if (esp32Ws !== activeSocket) return;
    esp32Ws = null;
    setEsp32Disconnected(false);
  });

  activeSocket.on('error', (err: any) => {
    if (esp32Ws !== activeSocket) return;
    esp32Ws = null;
    setEsp32Disconnected(false);
    broadcastToClients({ type: 'esp32_error', error: err.message });
  });
}

export function disconnectESP32(): void {
  if (esp32Ws) {
    try { esp32Ws.close(); } catch (_e) {}
    esp32Ws = null;
  }
  setEsp32Disconnected(true);
}

export function sendToESP32(payload: any): boolean {
  if (esp32Ws && esp32Ws.readyState === WebSocket.OPEN) {
    esp32Ws.send(JSON.stringify(payload));
    return true;
  }
  return false;
}

export function checkReconnect(): void {
  if (esp32ConnectionMode === 'outbound' && esp32Status.connected && esp32Status.lastSeen) {
    const elapsed = Date.now() - esp32Status.lastSeen;
    if (elapsed > 10000 && esp32Ip) {
      connectToESP32(esp32Ip);
    }
  }
}

// Export status for route access
export { esp32Status, esp32Ip };
