import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import type { Multer } from 'multer';
import {
  state, analyzer, faultSoundsDir, getFaultSoundsList,
  getReferenceAlarmEngine, saveReferenceMetadata, referenceAlarmEngines
} from '../state.js';
import { broadcastToClients } from '../ws/handler.js';

export function createFaultSoundsRoutes(upload: Multer): Router {
  const router = Router();

  router.post('/upload', upload.single('audio'), async (req: any, res) => {
    if (!req.file) return res.status(400).json({ error: 'Dosya yuklenemedi' });
    const ext = path.extname(req.file.filename).toLowerCase();

    const response: any = {
      success: true,
      file: { name: req.file.filename, size: req.file.size, path: `/fault-sounds/${req.file.filename}` }
    };

    if (ext === '.wav') {
      try {
        const analysis = await analyzer.analyzeWavFile(req.file.path);
        const id = `ref_${Date.now()}`;
        state.references.set(id, {
          id,
          name: req.file.originalname,
          kind: 'wav',
          referenceType: 'fault',
          path: req.file.path,
          uploadedAt: new Date().toISOString(),
          sampleRate: analysis.targetSampleRate,
          duration: analysis.duration,
          fft: analysis.fftData,
          profile: analysis.profile || null
        });
        getReferenceAlarmEngine(id);
        state.activeReferenceId = id;
        saveReferenceMetadata();
        response.reference = {
          id,
          name: req.file.originalname,
          sampleRate: analysis.targetSampleRate,
          duration: analysis.duration,
          referenceType: 'fault'
        };
        broadcastToClients({
          type: 'reference_uploaded',
          reference: response.reference,
          activeReferenceId: state.activeReferenceId
        });
      } catch (err: any) {
        response.referenceError = err.message;
      }
    }

    res.json(response);
  });

  router.get('/', (_req, res) => {
    res.json({ sounds: getFaultSoundsList() });
  });

  router.delete('/:filename', (req, res) => {
    const sanitized = path.basename(req.params.filename);
    if (sanitized !== req.params.filename || sanitized.includes('..')) {
      return res.status(400).json({ error: 'Gecersiz dosya adi' });
    }
    const filePath = path.join(faultSoundsDir, sanitized);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Dosya bulunamadi' });

    fs.unlinkSync(filePath);
    for (const [id, ref] of state.references.entries()) {
      if (ref.path === filePath) {
        state.references.delete(id);
        referenceAlarmEngines.delete(id);
        state.selectedReferenceIds = state.selectedReferenceIds.filter((x) => x !== id);
        if (state.activeReferenceId === id) state.activeReferenceId = null;
      }
    }
    if (!state.activeReferenceId && state.selectedReferenceIds.length > 0) {
      state.activeReferenceId = state.selectedReferenceIds[0];
    }
    saveReferenceMetadata();
    broadcastToClients({
      type: 'reference_changed',
      activeReferenceId: state.activeReferenceId,
      selectedReferenceIds: state.selectedReferenceIds
    });
    res.json({
      success: true,
      activeReferenceId: state.activeReferenceId,
      selectedReferenceIds: state.selectedReferenceIds
    });
  });

  return router;
}
