/**
 * SOUNDATLAS Analysis Engine
 * Ported from HATA-ANALİZ-PROJESİ server.js lines 338-623
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { evaluateSimilarityAlarm } = require('./lib/alarm-policy.js');

import {
  state, analyzer, alarmEngine, esp32Status,
  getReferenceType, getAnalysisMode, getActiveReference,
  getReferenceAlarmEngine, referenceScore
} from './state.js';
import { broadcastToClients } from './ws/handler.js';
import { sendToESP32 } from './esp32.js';
import { updateLiveCalibration } from './calibration.js';

export function computeLiveSpectrumStats(rawSpectrum: number[]): {
  mean: number; std: number; cv: number; peak: number; peakToMean: number;
} {
  if (!Array.isArray(rawSpectrum) || rawSpectrum.length === 0) {
    return { mean: 0, std: 0, cv: 0, peak: 0, peakToMean: 0 };
  }

  const spectrum = rawSpectrum.map((v) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  });
  const len = spectrum.length;
  let sum = 0;
  let peak = 0;
  for (let i = 0; i < len; i++) {
    sum += spectrum[i];
    if (spectrum[i] > peak) peak = spectrum[i];
  }
  const mean = sum / Math.max(1, len);
  let varSum = 0;
  for (let i = 0; i < len; i++) {
    const d = spectrum[i] - mean;
    varSum += d * d;
  }
  const std = Math.sqrt(varSum / Math.max(1, len));
  const cv = mean > 1e-12 ? (std / mean) : 0;
  const peakToMean = mean > 1e-12 ? (peak / mean) : 0;

  return { mean, std, cv, peak, peakToMean };
}

function activeReferencePayload(): any {
  const ref = getActiveReference();
  if (!ref) return null;
  return {
    id: ref.id,
    name: ref.name,
    fft: ref.fft,
    referenceType: getReferenceType(ref)
  };
}

export function computeServerAnalysis(telemetry: any): any {
  const liveFft = Array.isArray(telemetry.fft_raw) ? telemetry.fft_raw : telemetry.fft;
  if (!Array.isArray(liveFft) || liveFft.length === 0) {
    return null;
  }

  const allRefs = Array.from(state.references.values()).filter((ref) => Array.isArray(ref.fft) && ref.fft.length > 0);
  const faultRefs = allRefs.filter((ref) => getReferenceType(ref) === 'fault');
  const negativeRefs = allRefs.filter((ref) => getReferenceType(ref) === 'negative');
  const normalRefs = allRefs.filter((ref) => getReferenceType(ref) === 'normal');
  const fallbackRef = getActiveReference();
  const fallbackType = fallbackRef ? getReferenceType(fallbackRef) : null;
  const fallbackAnalyzeRef = (fallbackType === 'fault' || fallbackType === 'normal') ? fallbackRef : null;
  const selectedFaultIdSet = new Set(state.selectedReferenceIds || []);
  const selectedFaultRefs = selectedFaultIdSet.size > 0
    ? faultRefs.filter((ref) => selectedFaultIdSet.has(ref.id))
    : faultRefs;
  const refsToAnalyze = faultRefs.length > 0
    ? (selectedFaultRefs.length > 0 ? selectedFaultRefs : faultRefs)
    : (fallbackAnalyzeRef ? [fallbackAnalyzeRef] : []);
  if (!refsToAnalyze.length) return null;

  const threshold = state.similarityThreshold;
  const now = Date.now();
  const policy = alarmEngine.policy || {};
  const minFaultNegativeMargin = Number(policy.minFaultNegativeMargin) || 0;
  const minFaultNormalMargin = Number(policy.minFaultNormalMargin) || 0;
  const faultTriggerMargin = Number(policy.faultTriggerMargin) || 0;
  const minCosinePositive = Number(policy.minCosinePositive) || 0;
  const minCorrelationPositive = Number(policy.minCorrelationPositive) || 0;
  const minLiveSpectralCv = Number(policy.minLiveSpectralCv) || 0;
  const minLivePeakToMean = Number(policy.minLivePeakToMean) || 0;
  const liveSpectrumStats = computeLiveSpectrumStats(liveFft);

  const negativeMatches = negativeRefs.map((ref) => {
    const similarityInfo = analyzer.compareToReference(liveFft, ref);
    return {
      referenceId: ref.id,
      referenceName: ref.name,
      similarity: similarityInfo.similarity,
      difference: similarityInfo.difference
    };
  }).sort((a: any, b: any) => b.similarity - a.similarity);

  const normalMatches = normalRefs.map((ref) => {
    const similarityInfo = analyzer.compareToReference(liveFft, ref);
    return {
      referenceId: ref.id,
      referenceName: ref.name,
      similarity: similarityInfo.similarity,
      difference: similarityInfo.difference
    };
  }).sort((a: any, b: any) => b.similarity - a.similarity);

  const bestNegative = negativeMatches[0] || null;
  const bestNormal = normalMatches[0] || null;

  const results = refsToAnalyze.map((ref) => {
    const similarityInfo = analyzer.compareToReference(liveFft, ref);
    const similarity = similarityInfo.similarity;
    const referenceType = getReferenceType(ref);
    const mode = getAnalysisMode(referenceType);
    const components = similarityInfo.components || {};
    const cosinePositive = Number(components.cosinePositive);
    const correlationPositive = Number(components.correlationPositive);
    const marginToNegative = bestNegative ? (similarity - bestNegative.similarity) : null;
    const marginToNormal = bestNormal ? (similarity - bestNormal.similarity) : null;
    const overThreshold = similarity - threshold;

    const negativeMarginGatePass = referenceType !== 'fault'
      ? true : (marginToNegative == null || marginToNegative >= minFaultNegativeMargin);
    const normalMarginGatePass = referenceType !== 'fault'
      ? true : (marginToNormal == null || marginToNormal >= minFaultNormalMargin);
    const triggerMarginGatePass = referenceType !== 'fault'
      ? true : (overThreshold >= faultTriggerMargin);
    const cosineGatePass = referenceType !== 'fault'
      ? true : (Number.isFinite(cosinePositive) && cosinePositive >= minCosinePositive);
    const correlationGatePass = referenceType !== 'fault'
      ? true : (Number.isFinite(correlationPositive) && correlationPositive >= minCorrelationPositive);
    const spectralCvGatePass = referenceType !== 'fault'
      ? true : (liveSpectrumStats.cv >= minLiveSpectralCv);
    const peakToMeanGatePass = referenceType !== 'fault'
      ? true : (liveSpectrumStats.peakToMean >= minLivePeakToMean);
    const externalGatePass = negativeMarginGatePass && normalMarginGatePass
      && triggerMarginGatePass && cosineGatePass && correlationGatePass
      && spectralCvGatePass && peakToMeanGatePass;

    const externalGateDetails = {
      negativeMarginGatePass, normalMarginGatePass, triggerMarginGatePass,
      cosineGatePass, correlationGatePass, spectralCvGatePass, peakToMeanGatePass,
      marginToNegative, marginToNormal, overThreshold,
      minFaultNegativeMargin, minFaultNormalMargin, faultTriggerMargin,
      minCosinePositive, minCorrelationPositive, minLiveSpectralCv, minLivePeakToMean,
      liveSpectrumStats,
      bestNegative: bestNegative ? { id: bestNegative.referenceId, name: bestNegative.referenceName, similarity: bestNegative.similarity } : null,
      bestNormal: bestNormal ? { id: bestNormal.referenceId, name: bestNormal.referenceName, similarity: bestNormal.similarity } : null
    };

    const decision = evaluateSimilarityAlarm({
      engine: getReferenceAlarmEngine(ref.id),
      mode, similarity, threshold, telemetry,
      externalCandidateGate: externalGatePass,
      externalNearGate: externalGatePass,
      externalGateDetails, now
    });

    return {
      referenceId: ref.id, referenceName: ref.name, referenceType, mode, threshold,
      similarity, difference: similarityInfo.difference, components,
      marginToNegative, marginToNormal, overThreshold,
      negativeMarginGatePass, normalMarginGatePass, triggerMarginGatePass,
      cosineGatePass, correlationGatePass, spectralCvGatePass, peakToMeanGatePass,
      externalGatePass, decision, alarm: decision.alarm,
      score: referenceScore({ mode, similarity })
    };
  });

  results.sort((a, b) => b.score - a.score);
  const alarmMatches = results.filter((r) => r.alarm).sort((a, b) => b.score - a.score);
  const primary = (alarmMatches.length > 0 ? alarmMatches[0] : results[0]);
  const alarm = alarmMatches.length > 0;

  state.lastSimilarity = {
    similarity: primary.similarity, difference: primary.difference, alarm,
    mode: primary.mode, referenceType: primary.referenceType,
    components: primary.components, decision: primary.decision,
    referenceId: primary.referenceId, referenceName: primary.referenceName,
    threshold, referenceCount: results.length,
    faultReferenceCount: faultRefs.length, negativeReferenceCount: negativeRefs.length,
    normalReferenceCount: normalRefs.length,
    minFaultNegativeMargin, minFaultNormalMargin, faultTriggerMargin,
    minCosinePositive, minCorrelationPositive, minLiveSpectralCv, minLivePeakToMean,
    liveSpectrumStats,
    bestNegative: bestNegative ? { id: bestNegative.referenceId, name: bestNegative.referenceName, similarity: bestNegative.similarity, difference: bestNegative.difference } : null,
    bestNormal: bestNormal ? { id: bestNormal.referenceId, name: bestNormal.referenceName, similarity: bestNormal.similarity, difference: bestNormal.difference } : null,
    matchedCount: alarmMatches.length,
    matchedReferences: alarmMatches.slice(0, 6).map((m) => ({ id: m.referenceId, name: m.referenceName, similarity: m.similarity, difference: m.difference })),
    topReferences: results.slice(0, 6).map((m) => ({
      id: m.referenceId, name: m.referenceName, similarity: m.similarity, difference: m.difference,
      marginToNegative: m.marginToNegative, marginToNormal: m.marginToNormal, overThreshold: m.overThreshold,
      negativeMarginGatePass: m.negativeMarginGatePass, normalMarginGatePass: m.normalMarginGatePass,
      triggerMarginGatePass: m.triggerMarginGatePass, cosineGatePass: m.cosineGatePass,
      correlationGatePass: m.correlationGatePass, spectralCvGatePass: m.spectralCvGatePass,
      peakToMeanGatePass: m.peakToMeanGatePass, alarm: m.alarm
    })),
    timestamp: now
  };

  state.analysisHistory.push({
    timestamp: state.lastSimilarity.timestamp,
    referenceId: primary.referenceId, referenceName: primary.referenceName,
    mode: primary.mode, threshold,
    similarity: primary.similarity, difference: primary.difference,
    marginToNegative: primary.marginToNegative, marginToNormal: primary.marginToNormal,
    overThreshold: primary.overThreshold, alarm, matchedCount: alarmMatches.length,
    decision: primary.decision
  });
  if (state.analysisHistory.length > 2000) {
    state.analysisHistory.shift();
  }
  return state.lastSimilarity;
}

export function handleEsp32Telemetry(telemetry: any): void {
  esp32Status.lastSeen = Date.now();
  updateLiveCalibration(telemetry);

  const analysis = computeServerAnalysis(telemetry);
  broadcastToClients({
    type: 'esp32_data',
    data: telemetry,
    analysis,
    activeReference: activeReferencePayload(),
    timestamp: Date.now()
  });

  if (analysis && analysis.alarm) {
    broadcastToClients({ type: 'server_alarm', analysis });
    sendToESP32({ cmd: 'test_alarm' });
  }
}
