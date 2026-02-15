/**
 * SOUNDATLAS WebSocket Handler
 * Ported from HATA-ANALİZ-PROJESİ server.js lines 157-165, 683-789
 */

import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import {
  state, alarmEngine, esp32Status, esp32Ip,
  updateReferenceSelection, normalizeSimilarityThreshold,
  applyPolicyToAllEngines, getFaultSoundsList
} from '../state.js';
import { attachInboundEsp32Socket, connectToESP32, disconnectESP32, sendToESP32 } from '../esp32.js';
import { finalizeLiveCalibration } from '../calibration.js';

const clients = new Set<WebSocket>();

export function broadcastToClients(data: any): void {
  const payload = JSON.stringify(data);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(payload);
  });
}

export function setupWebSocketHandler(wss: WebSocketServer): void {
  wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
    let wsType = 'dashboard';
    try {
      const host = request?.headers?.host || 'localhost';
      const url = new URL(request?.url || '/', `http://${host}`);
      wsType = url.searchParams.get('type') || 'dashboard';
    } catch (_e) {}

    if (wsType === 'esp32') {
      attachInboundEsp32Socket(ws, request);
      return;
    }

    // Dashboard client
    clients.add(ws);
    ws.send(JSON.stringify({
      type: 'status',
      esp32Connected: esp32Status.connected,
      esp32Ip,
      activeReferenceId: state.activeReferenceId,
      selectedReferenceIds: state.selectedReferenceIds,
      similarityThreshold: state.similarityThreshold,
      analysisPolicy: alarmEngine.policy
    }));

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        switch (data.cmd) {
          case 'connect_esp32':
            connectToESP32(data.ip);
            break;
          case 'disconnect_esp32':
            disconnectESP32();
            break;
          case 'send_to_esp32':
            sendToESP32(data.payload);
            break;
          case 'get_status':
            ws.send(JSON.stringify({
              type: 'status',
              esp32Connected: esp32Status.connected,
              esp32Ip
            }));
            break;
          case 'get_fault_sounds':
            ws.send(JSON.stringify({
              type: 'fault_sounds',
              sounds: getFaultSoundsList()
            }));
            break;
          case 'set_reference':
            if (Array.isArray(data.referenceIds)) {
              updateReferenceSelection(data.referenceIds);
              if (state.selectedReferenceIds.length > 0 && !state.selectedReferenceIds.includes(state.activeReferenceId!)) {
                state.activeReferenceId = state.selectedReferenceIds[0];
              }
            } else {
              state.activeReferenceId = data.referenceId || null;
            }
            broadcastToClients({
              type: 'reference_changed',
              activeReferenceId: state.activeReferenceId,
              selectedReferenceIds: state.selectedReferenceIds
            });
            break;
          case 'set_similarity_threshold':
            {
              const normalizedThreshold = normalizeSimilarityThreshold(data.threshold);
              if (normalizedThreshold == null) break;
              state.similarityThreshold = normalizedThreshold;
            }
            broadcastToClients({
              type: 'analysis_config',
              similarityThreshold: state.similarityThreshold,
              policy: alarmEngine.policy
            });
            break;
          case 'set_analysis_policy':
            {
              const policyInput = (data.policy && typeof data.policy === 'object') ? data.policy : {};
              const thresholdCandidate = data.similarityThreshold ?? data.threshold ?? policyInput.similarityThreshold ?? policyInput.threshold;
              if (thresholdCandidate !== undefined) {
                const normalizedThreshold = normalizeSimilarityThreshold(thresholdCandidate);
                if (normalizedThreshold != null) state.similarityThreshold = normalizedThreshold;
              }
              const { similarityThreshold: _s, threshold: _t, ...policyPatch } = policyInput;
              applyPolicyToAllEngines(policyPatch);
            }
            broadcastToClients({
              type: 'analysis_config',
              similarityThreshold: state.similarityThreshold,
              policy: alarmEngine.policy
            });
            break;
          case 'server_calibration_start':
            state.liveCalibration.active = true;
            state.liveCalibration.label = data.label || 'fan';
            state.liveCalibration.sum = null;
            state.liveCalibration.count = 0;
            broadcastToClients({
              type: 'server_calibration_state',
              active: true,
              label: state.liveCalibration.label
            });
            break;
          case 'server_calibration_stop':
            finalizeLiveCalibration();
            break;
          default:
            break;
        }
      } catch (err: any) {
        console.error('Browser message parse error:', err.message);
      }
    });

    ws.on('close', () => clients.delete(ws));
  });
}
