import React, { useEffect } from 'react';
import { useAppState, useAppDispatch } from '../../store/AppContext';

export function AlarmPopup() {
  const { showAlarm, alarmData } = useAppState();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!showAlarm) return;
    const timer = setTimeout(() => {
      dispatch({ type: 'HIDE_ALARM' });
    }, 5000);
    return () => clearTimeout(timer);
  }, [showAlarm, dispatch]);

  if (!showAlarm || !alarmData) return null;

  const similarity = alarmData.similarity != null ? (alarmData.similarity * 100).toFixed(1) : '??';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-red-900/90 border-2 border-red-500 rounded-2xl p-8 max-w-md text-center shadow-2xl animate-pulse">
        <div className="text-6xl mb-4">🚨</div>
        <h2 className="text-2xl font-bold text-red-200 mb-2">ANOMALY DETECTED</h2>
        <p className="text-red-300 mb-1 text-lg font-mono">{similarity}% match</p>
        {alarmData.referenceName && (
          <p className="text-red-400 text-sm">Reference: {alarmData.referenceName}</p>
        )}
        <button
          onClick={() => dispatch({ type: 'HIDE_ALARM' })}
          className="mt-6 px-6 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
