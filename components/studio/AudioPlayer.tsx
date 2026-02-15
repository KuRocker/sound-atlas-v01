import React, { useState, useCallback } from 'react';
import { useAppState } from '../../store/AppContext';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';

export function AudioPlayer() {
  const { faultSounds } = useAppState();
  const { isPlaying, currentTime, duration, loadFile, play, stop } = useAudioPlayer();
  const [selectedFile, setSelectedFile] = useState('');

  const handleFileSelect = useCallback(async (filename: string) => {
    setSelectedFile(filename);
    await loadFile(`/fault-sounds/${filename}`);
  }, [loadFile]);

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-[#16213e] border border-[#333] rounded-xl p-5 space-y-4">
      <h2 className="text-lg font-semibold text-[#e0e0e0]">Audio Player</h2>

      <select
        value={selectedFile}
        onChange={(e) => handleFileSelect(e.target.value)}
        className="w-full bg-[#1a1a2e] border border-[#444] rounded-lg px-3 py-2 text-sm text-[#e0e0e0] focus:border-[#d4a574] focus:outline-none"
      >
        <option value="">Select a sound file...</option>
        {faultSounds.map((f) => (
          <option key={f.name} value={f.name}>{f.name}</option>
        ))}
      </select>

      <div className="flex items-center gap-3">
        <button
          onClick={isPlaying ? stop : play}
          disabled={!selectedFile}
          className="px-4 py-2 bg-[#d4a574] hover:bg-[#c49564] disabled:bg-[#444] disabled:opacity-50 text-black rounded-lg text-sm font-medium transition-colors"
        >
          {isPlaying ? '⏹ Stop' : '▶ Play'}
        </button>
        <div className="flex-1">
          <div className="h-1.5 bg-[#333] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#d4a574] rounded-full transition-all"
              style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
            />
          </div>
        </div>
        <span className="text-xs text-[#999] font-mono min-w-[60px] text-right">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}
