import React from 'react';

interface StatusDotProps {
  connected: boolean;
  size?: 'sm' | 'md';
  label?: string;
}

export function StatusDot({ connected, size = 'sm', label }: StatusDotProps) {
  const sizeClass = size === 'md' ? 'w-3 h-3' : 'w-2 h-2';
  const color = connected ? 'bg-green-500' : 'bg-red-500';

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`${sizeClass} ${color} rounded-full ${connected ? 'animate-pulse' : ''}`} />
      {label && <span className="text-xs text-[#999]">{label}</span>}
    </span>
  );
}
