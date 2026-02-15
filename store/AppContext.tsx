import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import type {
  ESP32Status, ESP32Telemetry, AnalysisResult, AlarmPolicy,
  Reference, EventLogEntry, CalibrationState, FaultSound, ActiveReference
} from '../types';

// ---------- State ----------
export interface AppState {
  esp32Status: ESP32Status;
  latestTelemetry: ESP32Telemetry | null;
  references: Reference[];
  activeReferenceId: string | null;
  selectedReferenceIds: string[];
  similarityThreshold: number;
  analysisPolicy: Partial<AlarmPolicy>;
  latestAnalysis: AnalysisResult | null;
  liveSpectrum: number[];
  activeReferenceFft: number[];
  eventLog: EventLogEntry[];
  calibrationState: CalibrationState;
  faultSounds: FaultSound[];
  showAlarm: boolean;
  alarmData: any;
  wsConnected: boolean;
}

const initialState: AppState = {
  esp32Status: { connected: false, ip: null, lastSeen: null },
  latestTelemetry: null,
  references: [],
  activeReferenceId: null,
  selectedReferenceIds: [],
  similarityThreshold: 0.80,
  analysisPolicy: {},
  latestAnalysis: null,
  liveSpectrum: [],
  activeReferenceFft: [],
  eventLog: [],
  calibrationState: { active: false },
  faultSounds: [],
  showAlarm: false,
  alarmData: null,
  wsConnected: false,
};

// ---------- Actions ----------
type Action =
  | { type: 'SET_ESP32_STATUS'; payload: ESP32Status }
  | { type: 'SET_TELEMETRY'; payload: ESP32Telemetry }
  | { type: 'SET_REFERENCES'; payload: { references: Reference[]; activeReferenceId: string | null; selectedReferenceIds: string[]; threshold: number } }
  | { type: 'SET_ACTIVE_REFERENCE'; payload: { activeReferenceId: string | null; selectedReferenceIds: string[] } }
  | { type: 'SET_ANALYSIS'; payload: AnalysisResult }
  | { type: 'SET_ANALYSIS_POLICY'; payload: Partial<AlarmPolicy> }
  | { type: 'SET_LIVE_SPECTRUM'; payload: number[] }
  | { type: 'SET_REFERENCE_FFT'; payload: number[] }
  | { type: 'ADD_EVENT'; payload: EventLogEntry }
  | { type: 'CLEAR_EVENTS' }
  | { type: 'SET_CALIBRATION'; payload: CalibrationState }
  | { type: 'SET_FAULT_SOUNDS'; payload: FaultSound[] }
  | { type: 'SHOW_ALARM'; payload: any }
  | { type: 'HIDE_ALARM' }
  | { type: 'SET_WS_CONNECTED'; payload: boolean }
  | { type: 'SET_THRESHOLD'; payload: number };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_ESP32_STATUS':
      return { ...state, esp32Status: action.payload };
    case 'SET_TELEMETRY':
      return { ...state, latestTelemetry: action.payload };
    case 'SET_REFERENCES':
      return {
        ...state,
        references: action.payload.references,
        activeReferenceId: action.payload.activeReferenceId,
        selectedReferenceIds: action.payload.selectedReferenceIds,
        similarityThreshold: action.payload.threshold,
      };
    case 'SET_ACTIVE_REFERENCE':
      return {
        ...state,
        activeReferenceId: action.payload.activeReferenceId,
        selectedReferenceIds: action.payload.selectedReferenceIds,
      };
    case 'SET_ANALYSIS':
      return { ...state, latestAnalysis: action.payload };
    case 'SET_ANALYSIS_POLICY':
      return { ...state, analysisPolicy: action.payload };
    case 'SET_LIVE_SPECTRUM':
      return { ...state, liveSpectrum: action.payload };
    case 'SET_REFERENCE_FFT':
      return { ...state, activeReferenceFft: action.payload };
    case 'ADD_EVENT': {
      const log = [action.payload, ...state.eventLog].slice(0, 120);
      return { ...state, eventLog: log };
    }
    case 'CLEAR_EVENTS':
      return { ...state, eventLog: [] };
    case 'SET_CALIBRATION':
      return { ...state, calibrationState: action.payload };
    case 'SET_FAULT_SOUNDS':
      return { ...state, faultSounds: action.payload };
    case 'SHOW_ALARM':
      return { ...state, showAlarm: true, alarmData: action.payload };
    case 'HIDE_ALARM':
      return { ...state, showAlarm: false, alarmData: null };
    case 'SET_WS_CONNECTED':
      return { ...state, wsConnected: action.payload };
    case 'SET_THRESHOLD':
      return { ...state, similarityThreshold: action.payload };
    default:
      return state;
  }
}

// ---------- Context ----------
interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be inside AppProvider');
  return ctx;
}

export function useAppState() {
  return useAppContext().state;
}

export function useAppDispatch() {
  return useAppContext().dispatch;
}
