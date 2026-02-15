import React from 'react';
import { EventLog } from './EventLog';
import { MLDetection } from './MLDetection';
import { AnalysisHistory } from './AnalysisHistory';

export function CasesView() {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-[#e0e0e0]">Cases</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <MLDetection />
          <AnalysisHistory />
        </div>
        <div>
          <EventLog />
        </div>
      </div>
    </div>
  );
}
