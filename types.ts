export enum MachineStatus {
  NORMAL = 'NORMAL',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

export enum FaultType {
  NONE = 'NONE',
  BEARING = 'BEARING', // Rulman - Jagged high freq
  LOOSENESS = 'LOOSENESS', // Gevşeklik - Offset low freq
  CAVITATION = 'CAVITATION', // Kavitasyon - Foamy/Dashed
}

export interface Machine {
  id: string;
  name: string;
  type: string;
  location: { x: number; y: number }; // Percentage 0-100 on map
  status: MachineStatus;
  faultType: FaultType;
  lastUpdate: string;
  bands: {
    low: number; // 0-100 intensity
    mid: number;
    high: number;
  };
  score: number; // 0-100 anomaly score
}

export interface Incident {
  id: string;
  machineId: string;
  timestamp: string;
  severity: MachineStatus;
  description: string;
  affectedBand: string; // e.g., "2-4kHz"
}

export interface SparkPoint {
  time: number;
  value: number;
}

// ============= SOUNDATLAS Server Types =============

export type ReferenceType = 'fault' | 'negative' | 'normal';
export type AnalysisMode = 'fault_match' | 'normal_deviation';

export interface Reference {
  id: string;
  name: string;
  kind: 'wav' | 'live';
  referenceType: ReferenceType;
  duration: number;
  sampleRate: number;
  uploadedAt: string;
}

export interface ESP32Status {
  connected: boolean;
  ip: string | null;
  lastSeen: number | null;
}

export interface ESP32Telemetry {
  fft?: number[];
  fft_raw?: number[];
  fft_base?: number[];
  audio_rms?: number;
  audio_zcr?: number;
  e_200_800?: number;
  e_800_2k?: number;
  e_2k_4k?: number;
  vib_rms?: number;
  vib_peak?: number;
  vib_x?: number;
  vib_y?: number;
  vib_z?: number;
  peak_freq?: number;
  sample_rate?: number;
  mic_signal_ok?: boolean;
  sw_hit?: boolean;
  state?: number;
  calibrated?: boolean;
  anomaly_count?: number;
  uptime?: number;
  ml_confidence?: number;
  ml_label?: string;
  ml_enabled?: boolean;
  alarm_enabled?: boolean;
  event?: string;
  k_factor?: number;
  calib_duration?: number;
  ml_threshold?: number;
  spec_delta_th?: number;
  sta_ssid?: string;
  sta_pass?: string;
  ap_ssid?: string;
  ap_pass?: string;
}

export interface SimilarityComponents {
  cosine: number;
  correlation: number;
  rbf: number;
  descriptor: number;
  profile: number;
  distance: number;
  cosinePositive: number;
  correlationPositive: number;
}

export interface AnalysisDecision {
  micHealthy: boolean;
  vibrationGatePass: boolean;
  externalGatePass: boolean;
  candidateMatch: boolean;
  confirmedMatch: boolean;
  confirmedByVotes: boolean;
  confirmedByNearStreak: boolean;
  voteCount: number;
  requiredVotes: number;
  windowSize: number;
  nearConsecutive: number;
  nearStreakRequired: number;
  cooldownActive: boolean;
  cooldownRemainingMs: number;
  liveRms: number;
  liveVibRms: number;
  alarm: boolean;
  externalGateDetails?: any;
}

export interface AnalysisResult {
  similarity: number;
  difference: number;
  alarm: boolean;
  mode: AnalysisMode;
  referenceType: ReferenceType;
  components: SimilarityComponents;
  decision: AnalysisDecision;
  referenceId: string;
  referenceName: string;
  threshold: number;
  matchedCount: number;
  matchedReferences?: any[];
  topReferences?: any[];
  bestNegative?: { id: string; name: string; similarity: number; difference?: number } | null;
  bestNormal?: { id: string; name: string; similarity: number; difference?: number } | null;
  liveSpectrumStats?: { mean: number; std: number; cv: number; peak: number; peakToMean: number };
  timestamp: number;
}

export interface AlarmPolicy {
  windowSize: number;
  minVotes: number;
  cooldownMs: number;
  minLiveRms: number;
  minVibRms: number;
  requireVibrationForFault: boolean;
  minFaultNegativeMargin: number;
  minFaultNormalMargin: number;
  faultTriggerMargin: number;
  minCosinePositive: number;
  minCorrelationPositive: number;
  minLiveSpectralCv: number;
  minLivePeakToMean: number;
  nearMargin: number;
  nearStreak: number;
}

export interface EventLogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'anomaly';
}

export interface CalibrationState {
  active: boolean;
  label?: string;
  done?: boolean;
  error?: string;
  referenceId?: string;
}

export interface FaultSound {
  name: string;
  size: number;
  date: string;
}

export interface ActiveReference {
  id: string;
  name: string;
  fft: number[];
  referenceType: ReferenceType;
}