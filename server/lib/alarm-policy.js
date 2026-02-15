const DEFAULT_POLICY = Object.freeze({
  windowSize: 8,
  minVotes: 5,
  cooldownMs: 3000,
  minLiveRms: 0.0022,
  minVibRms: 0.0018,
  requireVibrationForFault: true,
  minFaultNegativeMargin: 0.08,
  minFaultNormalMargin: 0.05,
  faultTriggerMargin: 0.04,
  minCosinePositive: 0.58,
  minCorrelationPositive: 0.58,
  minLiveSpectralCv: 0.22,
  minLivePeakToMean: 2.2,
  nearMargin: 0.03,
  nearStreak: 4
});

function clampInt(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function clampFloat(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function normalizePolicy(input = {}, base = DEFAULT_POLICY) {
  const windowSize = clampInt(input.windowSize, 3, 120, base.windowSize);
  const minVotesRaw = clampInt(input.minVotes, 1, 120, base.minVotes);
  const minVotes = Math.min(windowSize, minVotesRaw);
  const requireVibrationForFault = input.requireVibrationForFault == null
    ? !!base.requireVibrationForFault
    : !!input.requireVibrationForFault;

  return {
    windowSize,
    minVotes,
    cooldownMs: clampInt(input.cooldownMs, 0, 120000, base.cooldownMs),
    minLiveRms: clampFloat(input.minLiveRms, 0, 0.1, base.minLiveRms),
    minVibRms: clampFloat(input.minVibRms, 0, 0.2, base.minVibRms),
    requireVibrationForFault,
    minFaultNegativeMargin: clampFloat(input.minFaultNegativeMargin, 0, 1, base.minFaultNegativeMargin),
    minFaultNormalMargin: clampFloat(input.minFaultNormalMargin, 0, 1, base.minFaultNormalMargin),
    faultTriggerMargin: clampFloat(input.faultTriggerMargin, 0, 0.5, base.faultTriggerMargin),
    minCosinePositive: clampFloat(input.minCosinePositive, 0, 1, base.minCosinePositive),
    minCorrelationPositive: clampFloat(input.minCorrelationPositive, 0, 1, base.minCorrelationPositive),
    minLiveSpectralCv: clampFloat(input.minLiveSpectralCv, 0, 5, base.minLiveSpectralCv),
    minLivePeakToMean: clampFloat(input.minLivePeakToMean, 1, 20, base.minLivePeakToMean),
    nearMargin: clampFloat(input.nearMargin, 0, 0.2, base.nearMargin),
    nearStreak: clampInt(input.nearStreak, 1, 120, base.nearStreak)
  };
}

function createAlarmEngine(policy = {}) {
  return {
    policy: normalizePolicy(policy),
    recent: [],
    lastAlarmAt: 0,
    nearConsecutive: 0
  };
}

function updateAlarmPolicy(engine, patch = {}) {
  engine.policy = normalizePolicy({ ...engine.policy, ...patch }, engine.policy);
  if (engine.recent.length > engine.policy.windowSize) {
    engine.recent = engine.recent.slice(-engine.policy.windowSize);
  }
  return engine.policy;
}

function isCandidateMatch({ mode, similarity, threshold, micHealthy }) {
  if (!micHealthy) return false;
  if (mode === 'normal_deviation') return similarity <= threshold;
  return similarity >= threshold;
}

function isNearFaultMatch({ mode, similarity, threshold, nearMargin, micHealthy }) {
  if (!micHealthy) return false;
  if (mode !== 'fault_match') return false;
  return similarity >= (threshold - nearMargin);
}

function evaluateSimilarityAlarm({
  engine,
  mode,
  similarity,
  threshold,
  telemetry,
  externalCandidateGate = true,
  externalNearGate = true,
  externalGateDetails = null,
  now = Date.now()
}) {
  const micSignalOk = telemetry?.mic_signal_ok !== false;
  const liveRms = Number(telemetry?.audio_rms) || 0;
  const liveVibRms = Number(telemetry?.vib_rms) || 0;
  const swHit = telemetry?.sw_hit === true || telemetry?.sw_hit === 1;
  const micHealthy = micSignalOk && liveRms >= engine.policy.minLiveRms;
  const vibrationDetected = swHit || liveVibRms >= engine.policy.minVibRms;
  const vibrationGatePass = mode !== 'fault_match'
    ? true
    : (!engine.policy.requireVibrationForFault || vibrationDetected);

  const candidateBaseMatch = isCandidateMatch({
    mode,
    similarity,
    threshold,
    micHealthy
  });
  const nearFaultBaseMatch = isNearFaultMatch({
    mode,
    similarity,
    threshold,
    nearMargin: engine.policy.nearMargin,
    micHealthy
  });
  const candidateMatch = candidateBaseMatch && vibrationGatePass && (externalCandidateGate !== false);
  const nearFaultMatch = nearFaultBaseMatch && vibrationGatePass && (externalNearGate !== false);

  if (nearFaultMatch) engine.nearConsecutive += 1;
  else engine.nearConsecutive = 0;

  engine.recent.push({
    ts: now,
    candidateMatch
  });
  if (engine.recent.length > engine.policy.windowSize) {
    engine.recent.shift();
  }

  const voteCount = engine.recent.reduce((acc, item) => acc + (item.candidateMatch ? 1 : 0), 0);
  const confirmedByVotes = voteCount >= engine.policy.minVotes;
  const confirmedByNearStreak = nearFaultMatch && engine.nearConsecutive >= engine.policy.nearStreak;
  const confirmedMatch = confirmedByVotes || confirmedByNearStreak;

  const elapsed = engine.lastAlarmAt > 0 ? (now - engine.lastAlarmAt) : Number.POSITIVE_INFINITY;
  const cooldownRemainingMs = engine.lastAlarmAt > 0
    ? Math.max(0, engine.policy.cooldownMs - elapsed)
    : 0;
  const cooldownActive = cooldownRemainingMs > 0;

  const alarm = confirmedMatch && !cooldownActive;
  if (alarm) engine.lastAlarmAt = now;

  return {
    micSignalOk,
    liveRms,
    liveVibRms,
    swHit,
    micHealthy,
    vibrationDetected,
    vibrationGatePass,
    requireVibrationForFault: engine.policy.requireVibrationForFault,
    externalCandidateGate: externalCandidateGate !== false,
    externalNearGate: externalNearGate !== false,
    externalGateDetails: externalGateDetails || null,
    candidateBaseMatch,
    candidateMatch,
    nearFaultBaseMatch,
    nearFaultMatch,
    nearConsecutive: engine.nearConsecutive,
    nearStreakRequired: engine.policy.nearStreak,
    nearMargin: engine.policy.nearMargin,
    confirmedMatch,
    confirmedByVotes,
    confirmedByNearStreak,
    voteCount,
    requiredVotes: engine.policy.minVotes,
    windowSize: engine.recent.length,
    cooldownActive,
    cooldownRemainingMs,
    alarm
  };
}

module.exports = {
  DEFAULT_POLICY,
  createAlarmEngine,
  updateAlarmPolicy,
  evaluateSimilarityAlarm
};
