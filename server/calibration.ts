/**
 * SOUNDATLAS Live Calibration
 * Ported from HATA-ANALİZ-PROJESİ server.js lines 625-681
 */

import { state, saveReferenceMetadata } from './state.js';
import { broadcastToClients } from './ws/handler.js';

export function updateLiveCalibration(telemetry: any): void {
  if (!state.liveCalibration.active) return;
  const liveFft = Array.isArray(telemetry.fft_raw) ? telemetry.fft_raw : telemetry.fft;
  if (!Array.isArray(liveFft) || liveFft.length === 0) return;

  if (!state.liveCalibration.sum) {
    state.liveCalibration.sum = new Array(liveFft.length).fill(0);
  }
  for (let i = 0; i < liveFft.length; i++) {
    state.liveCalibration.sum[i] += Number(liveFft[i]) || 0;
  }
  state.liveCalibration.count += 1;
}

export function finalizeLiveCalibration(): void {
  if (!state.liveCalibration.active) return;
  state.liveCalibration.active = false;
  if (!state.liveCalibration.sum || state.liveCalibration.count < 20) {
    broadcastToClients({
      type: 'server_calibration_state',
      active: false,
      error: 'Yeterli veri toplanamadi'
    });
    return;
  }

  const avg = state.liveCalibration.sum.map((v) => v / state.liveCalibration.count);
  const id = `live_${Date.now()}`;
  state.references.set(id, {
    id,
    name: `${state.liveCalibration.label || 'fan'}_live_ref`,
    kind: 'live',
    referenceType: 'normal',
    path: '',
    uploadedAt: new Date().toISOString(),
    sampleRate: 16000,
    duration: 0,
    fft: avg,
    profile: null
  });
  state.activeReferenceId = id;
  saveReferenceMetadata();

  state.liveCalibration.sum = null;
  state.liveCalibration.count = 0;
  broadcastToClients({
    type: 'server_calibration_state',
    active: false,
    done: true,
    referenceId: id
  });
  broadcastToClients({
    type: 'reference_changed',
    activeReferenceId: state.activeReferenceId,
    selectedReferenceIds: state.selectedReferenceIds
  });
}
