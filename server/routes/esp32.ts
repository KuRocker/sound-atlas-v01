import { Router } from 'express';
import { esp32Status, esp32Ip } from '../state.js';

export function createEsp32Routes(): Router {
  const router = Router();

  router.get('/status', (_req, res) => {
    res.json({ connected: esp32Status.connected, ip: esp32Ip, lastSeen: esp32Status.lastSeen });
  });

  return router;
}
