import { useCallback } from 'react';
import { useAppState } from '../store/AppContext';

export function useESP32(send: (data: any) => void) {
  const { esp32Status } = useAppState();

  const connect = useCallback((ip: string) => {
    send({ type: 'connect_esp32', ip });
  }, [send]);

  const disconnect = useCallback(() => {
    send({ type: 'disconnect_esp32' });
  }, [send]);

  const sendCommand = useCallback((command: string, params?: any) => {
    send({ type: 'send_to_esp32', command, params });
  }, [send]);

  const startCalibration = useCallback((label: string, duration: number) => {
    send({ type: 'server_calibration_start', label, duration });
  }, [send]);

  const stopCalibration = useCallback(() => {
    send({ type: 'server_calibration_stop' });
  }, [send]);

  const testAlarm = useCallback(() => {
    sendCommand('test_alarm');
  }, [sendCommand]);

  return {
    status: esp32Status,
    connect,
    disconnect,
    sendCommand,
    startCalibration,
    stopCalibration,
    testAlarm,
  };
}
