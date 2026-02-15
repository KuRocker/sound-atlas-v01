import { Router } from 'express';
import {
  state, getReferenceType, normalizeReferenceType,
  updateReferenceSelection, saveReferenceMetadata
} from '../state.js';
import { broadcastToClients } from '../ws/handler.js';

export function createReferencesRoutes(): Router {
  const router = Router();

  router.get('/references', (_req, res) => {
    const refs = Array.from(state.references.values()).map((r) => ({
      id: r.id,
      name: r.name,
      kind: r.kind || 'wav',
      referenceType: getReferenceType(r),
      duration: r.duration,
      sampleRate: r.sampleRate,
      uploadedAt: r.uploadedAt
    }));
    res.json({
      references: refs,
      activeReferenceId: state.activeReferenceId,
      selectedReferenceIds: state.selectedReferenceIds,
      threshold: state.similarityThreshold
    });
  });

  router.post('/references/:id/type', (req, res) => {
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ error: 'Invalid reference id' });
    const ref = state.references.get(id);
    if (!ref) return res.status(404).json({ error: 'Reference not found' });

    const requestedType = normalizeReferenceType(req.body?.referenceType, '');
    if (!requestedType) {
      return res.status(400).json({ error: 'Invalid reference type' });
    }

    const previousType = getReferenceType(ref);
    ref.referenceType = requestedType as any;

    if (previousType === 'fault' && requestedType !== 'fault') {
      state.selectedReferenceIds = state.selectedReferenceIds.filter((x) => x !== id);
      if (state.activeReferenceId === id && state.selectedReferenceIds.length > 0) {
        state.activeReferenceId = state.selectedReferenceIds[0];
      }
    }
    if (requestedType === 'fault') {
      const nextSelection = state.selectedReferenceIds.includes(id)
        ? state.selectedReferenceIds.slice()
        : state.selectedReferenceIds.concat(id);
      updateReferenceSelection(nextSelection);
    } else {
      updateReferenceSelection(state.selectedReferenceIds);
    }

    saveReferenceMetadata();
    broadcastToClients({
      type: 'reference_changed',
      activeReferenceId: state.activeReferenceId,
      selectedReferenceIds: state.selectedReferenceIds
    });

    res.json({
      success: true,
      reference: { id: ref.id, name: ref.name, referenceType: getReferenceType(ref) },
      activeReferenceId: state.activeReferenceId,
      selectedReferenceIds: state.selectedReferenceIds
    });
  });

  router.post('/reference/select', (req, res) => {
    const { referenceId, referenceIds } = req.body || {};

    if (Array.isArray(referenceIds)) {
      updateReferenceSelection(referenceIds);
      if (state.selectedReferenceIds.length > 0 && !state.selectedReferenceIds.includes(state.activeReferenceId!)) {
        state.activeReferenceId = state.selectedReferenceIds[0];
      }
      broadcastToClients({
        type: 'reference_changed',
        activeReferenceId: state.activeReferenceId,
        selectedReferenceIds: state.selectedReferenceIds
      });
      return res.json({
        success: true,
        activeReferenceId: state.activeReferenceId,
        selectedReferenceIds: state.selectedReferenceIds
      });
    }

    if (referenceId && !state.references.has(referenceId)) {
      return res.status(404).json({ error: 'Reference not found' });
    }
    state.activeReferenceId = referenceId || null;
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
