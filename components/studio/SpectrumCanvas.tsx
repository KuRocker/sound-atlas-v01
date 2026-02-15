import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useAppState } from '../../store/AppContext';

export function SpectrumCanvas() {
  const { liveSpectrum, activeReferenceFft } = useAppState();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const [logScale, setLogScale] = useState(true);
  const [mouseInfo, setMouseInfo] = useState<{ x: number; freq: number; db: number } | null>(null);

  const SAMPLE_RATE = 16000;
  const MIN_DB = -110;
  const MAX_DB = 0;

  const freqToX = useCallback((freq: number, width: number, numBins: number) => {
    const maxFreq = SAMPLE_RATE / 2;
    if (logScale) {
      const minLog = Math.log10(20);
      const maxLog = Math.log10(maxFreq);
      const logFreq = Math.log10(Math.max(20, freq));
      return ((logFreq - minLog) / (maxLog - minLog)) * width;
    }
    return (freq / maxFreq) * width;
  }, [logScale]);

  const xToFreq = useCallback((x: number, width: number) => {
    const maxFreq = SAMPLE_RATE / 2;
    if (logScale) {
      const minLog = Math.log10(20);
      const maxLog = Math.log10(maxFreq);
      const logFreq = minLog + (x / width) * (maxLog - minLog);
      return Math.pow(10, logFreq);
    }
    return (x / width) * maxFreq;
  }, [logScale]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const pad = { top: 20, bottom: 30, left: 50, right: 20 };
    const plotW = w - pad.left - pad.right;
    const plotH = h - pad.top - pad.bottom;

    // Clear
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 0.5;
    const dbSteps = [-100, -80, -60, -40, -20, 0];
    for (const db of dbSteps) {
      const y = pad.top + ((MAX_DB - db) / (MAX_DB - MIN_DB)) * plotH;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
      ctx.stroke();
      ctx.fillStyle = '#555';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${db}`, pad.left - 5, y + 3);
    }

    // Frequency grid
    const freqMarks = [60, 120, 250, 500, 1000, 2000, 4000, 8000];
    for (const f of freqMarks) {
      if (f > SAMPLE_RATE / 2) continue;
      const x = pad.left + freqToX(f, plotW, liveSpectrum.length || 128);
      ctx.beginPath();
      ctx.moveTo(x, pad.top);
      ctx.lineTo(x, h - pad.bottom);
      ctx.stroke();
      ctx.fillStyle = '#555';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(f >= 1000 ? `${f / 1000}k` : `${f}`, x, h - pad.bottom + 12);
    }

    // Draw reference FFT (purple fill)
    if (activeReferenceFft.length > 0) {
      ctx.beginPath();
      ctx.moveTo(pad.left, h - pad.bottom);
      for (let i = 0; i < activeReferenceFft.length; i++) {
        const freq = (i / activeReferenceFft.length) * (SAMPLE_RATE / 2);
        const x = pad.left + freqToX(freq, plotW, activeReferenceFft.length);
        const val = activeReferenceFft[i] || 0;
        const db = val > 0 ? 20 * Math.log10(val + 1e-10) : MIN_DB;
        const clampedDb = Math.max(MIN_DB, Math.min(MAX_DB, db));
        const y = pad.top + ((MAX_DB - clampedDb) / (MAX_DB - MIN_DB)) * plotH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.lineTo(w - pad.right, h - pad.bottom);
      ctx.closePath();
      ctx.fillStyle = 'rgba(192, 132, 252, 0.15)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw live spectrum (copper/orange)
    if (liveSpectrum.length > 0) {
      ctx.beginPath();
      for (let i = 0; i < liveSpectrum.length; i++) {
        const freq = (i / liveSpectrum.length) * (SAMPLE_RATE / 2);
        const x = pad.left + freqToX(freq, plotW, liveSpectrum.length);
        const val = liveSpectrum[i] || 0;
        const db = val > 0 ? 20 * Math.log10(val + 1e-10) : MIN_DB;
        const clampedDb = Math.max(MIN_DB, Math.min(MAX_DB, db));
        const y = pad.top + ((MAX_DB - clampedDb) / (MAX_DB - MIN_DB)) * plotH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = '#d4a574';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Cursor inspector
    if (mouseInfo) {
      const cx = mouseInfo.x;
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(cx, pad.top);
      ctx.lineTo(cx, h - pad.bottom);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(30, 30, 50, 0.9)';
      ctx.fillRect(cx + 10, pad.top + 5, 120, 32);
      ctx.fillStyle = '#e0e0e0';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${mouseInfo.freq.toFixed(0)} Hz`, cx + 15, pad.top + 18);
      ctx.fillText(`${mouseInfo.db.toFixed(1)} dB`, cx + 15, pad.top + 32);
    }

    // Labels
    ctx.fillStyle = '#666';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Frequency (Hz)', w / 2, h - 2);
    ctx.save();
    ctx.translate(12, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Amplitude (dBFS)', 0, 0);
    ctx.restore();
  }, [liveSpectrum, activeReferenceFft, logScale, freqToX, mouseInfo]);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = 300 * window.devicePixelRatio;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = '300px';
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    const obs = new ResizeObserver(resize);
    obs.observe(container);
    resize();
    return () => obs.disconnect();
  }, []);

  // Animation loop
  useEffect(() => {
    const loop = () => {
      draw();
      animRef.current = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || liveSpectrum.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pad = { left: 50, right: 20, top: 20, bottom: 30 };
    const plotW = rect.width - pad.left - pad.right;
    const plotH = rect.height - pad.top - pad.bottom;

    if (x < pad.left || x > rect.width - pad.right) {
      setMouseInfo(null);
      return;
    }

    const freq = xToFreq(x - pad.left, plotW);
    const binIndex = Math.round((freq / (SAMPLE_RATE / 2)) * liveSpectrum.length);
    const val = liveSpectrum[Math.min(binIndex, liveSpectrum.length - 1)] || 0;
    const db = val > 0 ? 20 * Math.log10(val + 1e-10) : -110;

    setMouseInfo({ x, freq, db });
  }, [liveSpectrum, xToFreq]);

  return (
    <div className="bg-[#16213e] border border-[#333] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-[#e0e0e0]">Spectrum Analyzer</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#d4a574]">● Live</span>
          <span className="text-xs text-[#c084fc]">● Reference</span>
          <button
            onClick={() => setLogScale(!logScale)}
            className="px-2 py-0.5 bg-[#333] hover:bg-[#444] text-[#e0e0e0] rounded text-xs transition-colors"
          >
            {logScale ? 'LOG' : 'LIN'}
          </button>
        </div>
      </div>
      <div ref={containerRef} className="w-full">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setMouseInfo(null)}
          className="w-full rounded cursor-crosshair"
        />
      </div>
    </div>
  );
}
