import { Machine, MachineStatus, FaultType, Incident } from './types';

export const MOCK_MACHINES: Machine[] = [
  {
    id: 'RAM-01',
    name: 'RAM Makinesi (Kurutma)',
    type: 'Tekstil Finisaj',
    location: { x: 20, y: 30 },
    status: MachineStatus.NORMAL,
    faultType: FaultType.NONE,
    lastUpdate: '10sn önce',
    bands: { low: 20, mid: 15, high: 10 },
    score: 12,
  },
  {
    id: 'CNC-V4',
    name: 'CNC Dik İşleme - Hat A',
    type: 'Metal İşleme',
    location: { x: 45, y: 50 },
    status: MachineStatus.CRITICAL,
    faultType: FaultType.BEARING, // Rulman sesi
    lastUpdate: 'Şimdi',
    bands: { low: 30, mid: 40, high: 95 },
    score: 92,
  },
  {
    id: 'TRN-202',
    name: 'Torna Tesviye Ünitesi',
    type: 'Çelik Üretim',
    location: { x: 70, y: 25 },
    status: MachineStatus.WARNING,
    faultType: FaultType.LOOSENESS, // Gevşeklik/Titreşim
    lastUpdate: '2dk önce',
    bands: { low: 85, mid: 30, high: 20 },
    score: 65,
  },
  {
    id: 'PMP-X5',
    name: 'Soğutma Pompası',
    type: 'Yardımcı Tesis',
    location: { x: 35, y: 75 },
    status: MachineStatus.WARNING,
    faultType: FaultType.CAVITATION, // Kavitasyon sesi
    lastUpdate: '30sn önce',
    bands: { low: 20, mid: 88, high: 30 },
    score: 58,
  },
  {
    id: 'FAN-EX',
    name: 'Egzoz Fanı 2',
    type: 'Havalandırma',
    location: { x: 80, y: 65 },
    status: MachineStatus.NORMAL,
    faultType: FaultType.NONE,
    lastUpdate: '5dk önce',
    bands: { low: 10, mid: 12, high: 10 },
    score: 5,
  },
];

export const RECENT_INCIDENTS: Incident[] = [
  {
    id: 'VAKA-001',
    machineId: 'CNC-V4',
    timestamp: '10:42',
    severity: MachineStatus.CRITICAL,
    description: 'Yüksek frekanslı rulman uğultusu (Spindle)',
    affectedBand: '4-8kHz',
  },
  {
    id: 'VAKA-002',
    machineId: 'PMP-X5',
    timestamp: '09:15',
    severity: MachineStatus.WARNING,
    description: 'Düzensiz akış gürültüsü / Kavitasyon',
    affectedBand: '1-2kHz',
  },
  {
    id: 'VAKA-003',
    machineId: 'TRN-202',
    timestamp: 'Dün',
    severity: MachineStatus.WARNING,
    description: '1X RPM devir bazlı titreşim',
    affectedBand: '0-500Hz',
  },
];
