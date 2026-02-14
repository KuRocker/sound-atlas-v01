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