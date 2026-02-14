import React, { useMemo } from 'react';
import { Machine, MachineStatus, FaultType } from '../types';

interface MachineOrbProps {
  machine: Machine;
  size?: number;
  onClick?: () => void;
  selected?: boolean;
}

const MachineOrb: React.FC<MachineOrbProps> = ({ machine, size = 64, onClick, selected }) => {
  const { status, faultType } = machine;

  // Color Mapping
  const colorClass = useMemo(() => {
    switch (status) {
      case MachineStatus.CRITICAL: return 'text-magenta-core';
      case MachineStatus.WARNING: return 'text-copper-400';
      default: return 'text-silver-400';
    }
  }, [status]);

  const fillColor = useMemo(() => {
      switch (status) {
      case MachineStatus.CRITICAL: return '#d600ff';
      case MachineStatus.WARNING: return '#b87333';
      default: return '#94a3b8';
    }
  }, [status]);

  // Generate SVG paths based on fault type
  // This simulates the "Acoustic Geography" concept
  const rings = useMemo(() => {
    const center = size / 2;
    const steps = 60; // Resolution of the shape
    
    const generatePoly = (radius: number, type: 'smooth' | 'jagged' | 'offset' | 'dashed') => {
      let d = '';
      for (let i = 0; i <= steps; i++) {
        const angle = (i / steps) * Math.PI * 2;
        let r = radius;
        let cx = center;
        let cy = center;

        if (type === 'jagged') {
           // Bearing fault visualization: High frequency spikes
           r += Math.sin(angle * 20) * (size * 0.05);
        } else if (type === 'offset') {
           // Looseness visualization: Oval/Offset
           cx += Math.cos(angle) * (size * 0.05);
           cy += Math.sin(angle) * (size * 0.05);
        }
        
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        
        d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
      }
      return d + ' Z';
    };

    // Low Frequency Ring (Outer)
    const lowType = faultType === FaultType.LOOSENESS ? 'offset' : 'smooth';
    const lowPath = generatePoly(size * 0.45, lowType);

    // Mid Frequency Ring
    const midType = 'smooth';
    const midRadius = size * 0.30;
    const midPath = generatePoly(midRadius, midType);

    // High Frequency Ring (Inner)
    const highType = faultType === FaultType.BEARING ? 'jagged' : 'smooth';
    const highPath = generatePoly(size * 0.15, highType);

    return { lowPath, midPath, highPath };
  }, [size, faultType]);

  return (
    <div 
      className={`relative cursor-pointer group transition-transform duration-300 ${selected ? 'scale-125 z-10' : 'hover:scale-110'}`}
      style={{ width: size, height: size }}
      onClick={onClick}
    >
      {/* Label Tooltip */}
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-graphite-800 border border-silver-500 text-xs px-2 py-1 rounded whitespace-nowrap z-20 pointer-events-none font-mono">
        {machine.name} <span className={colorClass}>[{machine.score}%]</span>
      </div>

      <svg width={size} height={size} className="overflow-visible">
        {/* Glow Filter */}
        <defs>
          <filter id={`glow-${machine.id}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Low Freq Ring */}
        <path 
          d={rings.lowPath} 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="1.5" 
          className={`${colorClass} opacity-30`}
        />

        {/* Mid Freq Ring */}
        <path 
          d={rings.midPath} 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="1.5" 
          strokeDasharray={faultType === FaultType.CAVITATION ? "2 2" : "none"} // Cavitation effect
          className={`${colorClass} opacity-60`}
        />

        {/* High Freq Ring / Core */}
        <path 
          d={rings.highPath} 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          className={`${colorClass}`}
          filter={status !== MachineStatus.NORMAL ? `url(#glow-${machine.id})` : undefined}
        />
        
        {/* Center Dot */}
        <circle cx={size/2} cy={size/2} r={2} fill={fillColor} />
        
        {/* Connection Line (decoration) */}
        {selected && (
             <line x1={size/2} y1={size} x2={size/2} y2={size + 20} stroke={fillColor} strokeWidth="1" strokeDasharray="4 2" />
        )}
      </svg>
    </div>
  );
};

export default MachineOrb;
