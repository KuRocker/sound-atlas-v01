/**
 * SOUNDATLAS Server State Module
 * Ported from HATA-ANALİZ-PROJESİ server.js lines 26-123, 257-336
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const AudioAnalyzer = require('./lib/audio-analyzer.js');
const { createAlarmEngine, updateAlarmPolicy } = require('./lib/alarm-policy.js');

export { updateAlarmPolicy };

export const analyzer = new AudioAnalyzer({
  sampleRate: 16000,
  fftSize: 256,
  numBands: 128,
  minFreq: 20,
  maxFreq: 8000
});

export interface ReferenceEntry {
  id: string;
  name: string;
  kind: 'wav' | 'live';
  referenceType: 'fault' | 'negative' | 'normal';
  path: string;
  uploadedAt: string;
  sampleRate: number;
  duration: number;
  fft: number[];
  profile: any;
}

export interface LiveCalibration {
  active: boolean;
  label: string;
  sum: number[] | null;
  count: number;
}

export interface ServerState {
  references: Map<string, ReferenceEntry>;
  activeReferenceId: string | null;
  selectedReferenceIds: string[];
  similarityThreshold: number;
  lastSimilarity: any;
  analysisHistory: any[];
  liveCalibration: LiveCalibration;
}

export const state: ServerState = {
  references: new Map(),
  activeReferenceId: null,
  selectedReferenceIds: [],
  similarityThreshold: 0.80,
  lastSimilarity: null,
  analysisHistory: [],
  liveCalibration: {
    active: false,
    label: 'fan',
    sum: null,
    count: 0
  }
};

export const alarmEngine = createAlarmEngine();
export const referenceAlarmEngines = new Map<string, any>();

// ESP32 status lives here to avoid circular deps between esp32.ts and analysis.ts
export const esp32Status = { connected: false, lastSeen: null as number | null };
export let esp32Ip: string | null = null;
export let esp32ConnectionMode: 'none' | 'inbound' | 'outbound' = 'none';

export function setEsp32Ip(ip: string | null) { esp32Ip = ip; }
export function setEsp32ConnectionMode(mode: 'none' | 'inbound' | 'outbound') { esp32ConnectionMode = mode; }

// --- Directories ---
export const faultSoundsDir = path.join(__dirname, 'fault-sounds');
export const referenceDir = path.join(__dirname, 'reference-cache');
export const uploadsDir = path.join(__dirname, 'uploads');
export const referenceMetaPath = path.join(referenceDir, 'metadata.json');

// --- Helper Functions (server.js lines 50-123) ---

export function normalizeReferenceType(value: any, fallback: string = 'fault'): string {
  const type = String(value || '').toLowerCase().trim();
  if (type === 'normal') return 'normal';
  if (type === 'negative') return 'negative';
  if (type === 'fault') return 'fault';
  return fallback;
}

export function getReferenceType(ref: ReferenceEntry | null | undefined): string {
  return normalizeReferenceType(ref?.referenceType, 'fault');
}

export function getAnalysisMode(referenceType: string): string {
  return referenceType === 'normal' ? 'normal_deviation' : 'fault_match';
}

export function normalizeReferenceSelection(referenceIds: any[]): string[] {
  if (!Array.isArray(referenceIds)) return [];
  const validFaultIds = new Set(
    Array.from(state.references.entries())
      .filter(([, ref]) => getReferenceType(ref) === 'fault')
      .map(([id]) => id)
  );
  const selected: string[] = [];
  for (const rawId of referenceIds) {
    const id = String(rawId || '').trim();
    if (!id || !validFaultIds.has(id) || selected.includes(id)) continue;
    selected.push(id);
  }
  return selected;
}

export function updateReferenceSelection(referenceIds: any[]): string[] {
  state.selectedReferenceIds = normalizeReferenceSelection(referenceIds);
  return state.selectedReferenceIds;
}

export function referenceScore(result: { mode: string; similarity: number }): number {
  return result.mode === 'normal_deviation'
    ? (1 - result.similarity)
    : result.similarity;
}

export function normalizeSimilarityThreshold(value: any): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.min(1, parsed));
}

export function getReferenceAlarmEngine(referenceId: string): any {
  let engine = referenceAlarmEngines.get(referenceId);
  if (!engine) {
    engine = createAlarmEngine(alarmEngine.policy);
    referenceAlarmEngines.set(referenceId, engine);
  }
  return engine;
}

export function pruneReferenceAlarmEngines(): void {
  const validIds = new Set(state.references.keys());
  for (const id of referenceAlarmEngines.keys()) {
    if (!validIds.has(id)) {
      referenceAlarmEngines.delete(id);
    }
  }
}

export function applyPolicyToAllEngines(policyPatch: any = null): any {
  const policy = policyPatch ? updateAlarmPolicy(alarmEngine, policyPatch) : alarmEngine.policy;
  for (const engine of referenceAlarmEngines.values()) {
    updateAlarmPolicy(engine, policy);
  }
  return policy;
}

export function getActiveReference(): ReferenceEntry | null {
  if (!state.activeReferenceId) return null;
  return state.references.get(state.activeReferenceId) || null;
}

export function getFaultSoundsList(): { name: string; size: number; date: Date }[] {
  try {
    const files = fs.readdirSync(faultSoundsDir);
    const allowed = new Set(['.wav', '.mp3', '.ogg', '.m4a']);
    return files
      .filter((file) => !file.startsWith('.'))
      .filter((file) => allowed.has(path.extname(file).toLowerCase()))
      .map((file) => {
        const stats = fs.statSync(path.join(faultSoundsDir, file));
        return { name: file, size: stats.size, date: stats.mtime };
      })
      .filter((entry) => entry.size > 0);
  } catch (_e) {
    return [];
  }
}

// --- Reference Metadata Persistence (server.js lines 257-313) ---

export function saveReferenceMetadata(): void {
  const data = Array.from(state.references.values()).map((r) => ({
    id: r.id,
    name: r.name,
    kind: r.kind || 'wav',
    referenceType: getReferenceType(r),
    path: r.path,
    uploadedAt: r.uploadedAt,
    sampleRate: r.sampleRate,
    duration: r.duration,
    fft: r.fft,
    profile: r.profile || null
  }));
  fs.writeFileSync(referenceMetaPath, JSON.stringify(data, null, 2));
}

export async function loadReferenceMetadata(): Promise<void> {
  if (!fs.existsSync(referenceMetaPath)) return;
  try {
    const data = JSON.parse(fs.readFileSync(referenceMetaPath, 'utf8'));
    for (const item of data) {
      if (item.kind === 'live' && Array.isArray(item.fft)) {
        state.references.set(item.id, {
          id: item.id,
          name: item.name,
          kind: 'live',
          referenceType: normalizeReferenceType(item.referenceType, 'normal') as any,
          path: '',
          uploadedAt: item.uploadedAt,
          sampleRate: item.sampleRate || 16000,
          duration: item.duration || 0,
          fft: item.fft,
          profile: item.profile || null
        });
        continue;
      }
      if (!item.path || !fs.existsSync(item.path)) continue;
      const analysis = await analyzer.analyzeWavFile(item.path);
      state.references.set(item.id, {
        id: item.id,
        name: item.name,
        kind: item.kind || 'wav',
        referenceType: normalizeReferenceType(item.referenceType, 'fault') as any,
        path: item.path,
        uploadedAt: item.uploadedAt,
        sampleRate: analysis.targetSampleRate,
        duration: analysis.duration,
        fft: analysis.fftData,
        profile: item.profile || analysis.profile
      });
    }
    pruneReferenceAlarmEngines();
    updateReferenceSelection(state.selectedReferenceIds);
    applyPolicyToAllEngines();
  } catch (err: any) {
    console.error('Reference metadata load error:', err.message);
  }
}
