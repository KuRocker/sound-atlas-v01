import React, { useRef, useState, useEffect } from 'react';
import { MOCK_MACHINES } from '../constants';
import MachineOrb from './MachineOrb';
import { Machine } from '../types';

interface AcousticMapProps {
  onMachineSelect: (machine: Machine) => void;
  selectedMachineId: string | null;
}

const AcousticMap: React.FC<AcousticMapProps> = ({ onMachineSelect, selectedMachineId }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Simple pan/zoom logic
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    const newScale = Math.max(0.5, Math.min(3, scale - e.deltaY * 0.001));
    setScale(newScale);
  };

  return (
    <div 
      className="w-full h-full bg-graphite-900 overflow-hidden relative cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      ref={containerRef}
    >
      {/* Background Grid - Acoustic Topography Metaphor */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            backgroundImage: 'radial-gradient(circle, #334155 1px, transparent 1px)',
            backgroundSize: '40px 40px'
        }}
      />
      
      {/* Map Content */}
      <div 
        className="absolute inset-0 transition-transform duration-75 ease-out origin-center"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}
      >
        {/* Connection Lines (Simulated Topology) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
            <path 
                d="M 20% 30% L 45% 50% L 70% 25% M 45% 50% L 35% 75% M 70% 25% L 80% 65%"
                stroke="#334155" 
                strokeWidth="1"
                fill="none" 
                className="opacity-20"
            />
        </svg>

        {/* Nodes */}
        {MOCK_MACHINES.map((machine) => (
          <div
            key={machine.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${machine.location.x}%`, top: `${machine.location.y}%` }}
          >
            <MachineOrb 
                machine={machine} 
                onClick={() => onMachineSelect(machine)} 
                selected={selectedMachineId === machine.id}
            />
          </div>
        ))}
      </div>

      {/* Legend / Overlay Controls */}
      <div className="absolute bottom-6 left-6 flex flex-col gap-2 pointer-events-none">
         <div className="bg-graphite-800/80 backdrop-blur border border-slate-700 p-3 rounded-lg text-xs space-y-2 pointer-events-auto">
            <h4 className="font-bold text-slate-300 mb-1">AKUSTİK ANAHTAR</h4>
            <div className="flex items-center gap-2 text-slate-400">
                <div className="w-3 h-3 border border-silver-400 rounded-full"></div> <span>Normal</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
                <div className="w-3 h-3 border border-copper-400 rounded-full"></div> <span>Uyarı (Bakır)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
                <div className="w-3 h-3 border border-magenta-core rounded-full shadow-[0_0_8px_rgba(214,0,255,0.5)]"></div> <span>Kritik (Macenta)</span>
            </div>
         </div>
      </div>
      
       {/* Zoom Controls */}
       <div className="absolute bottom-6 right-6 flex flex-col gap-1 bg-graphite-800 border border-slate-700 rounded-lg overflow-hidden pointer-events-auto">
            <button onClick={() => setScale(s => Math.min(3, s + 0.2))} className="p-2 hover:bg-slate-700 text-slate-400">+</button>
            <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="p-2 hover:bg-slate-700 text-slate-400">-</button>
       </div>
    </div>
  );
};

export default AcousticMap;
