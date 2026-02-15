import React from 'react';

interface MetricBarProps {
  label: string;
  value: number;
  max?: number;
  color?: string;
  unit?: string;
  showValue?: boolean;
}

export function MetricBar({ label, value, max = 100, color = '#d4a574', unit = '', showValue = true }: MetricBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-[#999]">{label}</span>
        {showValue && <span className="text-[#e0e0e0] font-mono">{typeof value === 'number' ? value.toFixed(2) : value}{unit}</span>}
      </div>
      <div className="h-1.5 bg-[#333] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
