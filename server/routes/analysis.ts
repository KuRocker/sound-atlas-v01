import { Router } from 'express';
import {
  state, alarmEngine, normalizeSimilarityThreshold, applyPolicyToAllEngines
} from '../state.js';
import { broadcastToClients } from '../ws/handler.js';

export function createAnalysisRoutes(): Router {
  const router = Router();

  router.get('/last', (_req, res) => {
    res.json({
      analysis: state.lastSimilarity,
      activeReferenceId: state.activeReferenceId,
      policy: alarmEngine.policy
    });
  });

  router.post('/threshold', (req, res) => {
    const normalizedThreshold = normalizeSimilarityThreshold(req.body?.threshold);
    if (normalizedThreshold == null) return res.status(400).json({ error: 'Invalid threshold' });
    state.similarityThreshold = normalizedThreshold;
    broadcastToClients({
      type: 'analysis_config',
      similarityThreshold: state.similarityThreshold,
      policy: alarmEngine.policy
    });
    res.json({ success: true, threshold: state.similarityThreshold });
  });

  router.get('/policy', (_req, res) => {
    res.json({ policy: alarmEngine.policy, similarityThreshold: state.similarityThreshold });
  });

  router.post('/policy', (req, res) => {
    const input = (req.body && typeof req.body === 'object') ? req.body : {};
    const thresholdCandidate = input.similarityThreshold ?? input.threshold;
    if (thresholdCandidate !== undefined) {
      const normalizedThreshold = normalizeSimilarityThreshold(thresholdCandidate);
      if (normalizedThreshold == null) {
        return res.status(400).json({ error: 'Invalid similarity threshold' });
      }
      state.similarityThreshold = normalizedThreshold;
    }
    const { similarityThreshold: _s, threshold: _t, ...policyPatch } = input;
    const policy = applyPolicyToAllEngines(policyPatch);
    broadcastToClients({
      type: 'analysis_config',
      similarityThreshold: state.similarityThreshold,
      policy
    });
    res.json({ success: true, policy, similarityThreshold: state.similarityThreshold });
  });

  router.get('/history', (req, res) => {
    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw)
      ? Math.max(1, Math.min(2000, Math.round(limitRaw)))
      : 200;
    const history = state.analysisHistory.slice(-limit);
    res.json({ history, total: state.analysisHistory.length });
  });

  return router;
}
