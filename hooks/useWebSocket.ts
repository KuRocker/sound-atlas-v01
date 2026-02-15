import { useEffect, useRef, useCallback } from 'react';
import { useAppDispatch } from '../store/AppContext';

const MAX_RETRIES = 5;
const RETRY_DELAY = 1500;

export function useWebSocket() {
  const dispatch = useAppDispatch();
  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.hostname;
    const port = window.location.port || '3001';
    const url = `${protocol}://${host}:${port}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      retriesRef.current = 0;
      dispatch({ type: 'SET_WS_CONNECTED', payload: true });
      // Request initial state
      ws.send(JSON.stringify({ type: 'get_status' }));
    };

    ws.onclose = () => {
      dispatch({ type: 'SET_WS_CONNECTED', payload: false });
      if (mountedRef.current && retriesRef.current < MAX_RETRIES) {
        retriesRef.current++;
        setTimeout(connect, RETRY_DELAY);
      }
    };

    ws.onerror = () => {
      ws.close();
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleMessage(msg);
      } catch { /* ignore parse errors */ }
    };
  }, [dispatch]);

  const handleMessage = useCallback((msg: any) => {
    switch (msg.type) {
      case 'esp32_status':
        dispatch({ type: 'SET_ESP32_STATUS', payload: {
          connected: msg.connected,
          ip: msg.ip || null,
          lastSeen: msg.lastSeen || null,
        }});
        break;

      case 'esp32_telemetry': {
        const t = msg.data || msg;
        dispatch({ type: 'SET_TELEMETRY', payload: t });
        const fft = t.fft_raw || t.fft;
        if (Array.isArray(fft) && fft.length > 0) {
          dispatch({ type: 'SET_LIVE_SPECTRUM', payload: fft });
        }
        break;
      }

      case 'server_analysis': {
        dispatch({ type: 'SET_ANALYSIS', payload: msg.data || msg });
        if (msg.data?.alarm) {
          dispatch({ type: 'SHOW_ALARM', payload: msg.data });
          dispatch({ type: 'ADD_EVENT', payload: {
            timestamp: new Date().toISOString(),
            message: `ALARM: ${msg.data.referenceName} (${(msg.data.similarity * 100).toFixed(1)}%)`,
            type: 'anomaly',
          }});
        }
        break;
      }

      case 'reference_changed':
        dispatch({ type: 'SET_ACTIVE_REFERENCE', payload: {
          activeReferenceId: msg.activeReferenceId,
          selectedReferenceIds: msg.selectedReferenceIds || [],
        }});
        if (msg.activeReferenceFft) {
          dispatch({ type: 'SET_REFERENCE_FFT', payload: msg.activeReferenceFft });
        }
        break;

      case 'server_calibration_state':
        dispatch({ type: 'SET_CALIBRATION', payload: {
          active: msg.active,
          label: msg.label,
          done: msg.done,
          error: msg.error,
          referenceId: msg.referenceId,
        }});
        break;

      case 'fault_sounds_list':
        dispatch({ type: 'SET_FAULT_SOUNDS', payload: msg.files || [] });
        break;

      case 'status_response':
        dispatch({ type: 'SET_ESP32_STATUS', payload: {
          connected: msg.esp32?.connected || false,
          ip: msg.esp32?.ip || null,
          lastSeen: msg.esp32?.lastSeen || null,
        }});
        if (msg.references) {
          dispatch({ type: 'SET_REFERENCES', payload: {
            references: msg.references || [],
            activeReferenceId: msg.activeReferenceId || null,
            selectedReferenceIds: msg.selectedReferenceIds || [],
            threshold: msg.similarityThreshold || 0.80,
          }});
        }
        if (msg.policy) {
          dispatch({ type: 'SET_ANALYSIS_POLICY', payload: msg.policy });
        }
        if (msg.activeReferenceFft) {
          dispatch({ type: 'SET_REFERENCE_FFT', payload: msg.activeReferenceFft });
        }
        break;
    }
  }, [dispatch]);

  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      wsRef.current?.close();
    };
  }, [connect]);

  return { send, ws: wsRef };
}
