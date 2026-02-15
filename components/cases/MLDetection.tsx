import React from 'react';
import { useAppState } from '../../store/AppContext';
import { MetricBar } from '../shared/MetricBar';

export function MLDetection() {
  const { latestAnalysis, latestTelemetry, similarityThreshold } = useAppState();

  return (
    <div className="bg-[#16213e] border border-[#333] rounded-xl p-5 space-y-4">
      <h2 className="text-lg font-semibold text-[#e0e0e0]">ML Detection</h2>

      {!latestAnalysis ? (
        <p className="text-sm text-[#666] text-center py-4">Waiting for analysis data...</p>
      ) : (
        <>
          {/* Main similarity */}
          <div className="text-center py-3">
            <div className={`text-5xl font-bold font-mono ${
              latestAnalysis.alarm ? 'text-red-400 animate-pulse' : 'text-green-400'
            }`}>
              {(latestAnalysis.similarity * 100).toFixed(1)}%
            </div>
            <p className="text-sm text-[#999] mt-1">
              {latestAnalysis.alarm ? '🚨 ALARM' : '✓ Normal'} — {latestAnalysis.mode}
            </p>
            <p className="text-xs text-[#666]">Threshold: {(similarityThreshold * 100).toFixed(0)}%</p>
          </div>

          {/* Components */}
          <div className="space-y-2">
            <h3 className="text-sm text-[#999]">Components</h3>
            <MetricBar label="Cosine" value={latestAnalysis.components.cosine} max={1} color="#3b82f6" />
            <MetricBar label="Correlation" value={latestAnalysis.components.correlation} max={1} color="#8b5cf6" />
            <MetricBar label="RBF" value={latestAnalysis.components.rbf} max={1} color="#06b6d4" />
            <MetricBar label="Descriptor" value={latestAnalysis.components.descriptor} max={1} color="#10b981" />
            <MetricBar label="Profile" value={latestAnalysis.components.profile} max={1} color="#f59e0b" />
          </div>

          {/* Decision gates */}
          <div className="border-t border-[#333] pt-3">
            <h3 className="text-sm text-[#999] mb-2">Decision Gates</h3>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <GateItem label="Mic Healthy" pass={latestAnalysis.decision.micHealthy} />
              <GateItem label="Vib Gate" pass={latestAnalysis.decision.vibrationGatePass} />
              <GateItem label="External Gate" pass={latestAnalysis.decision.externalGatePass} />
              <GateItem label="Candidate" pass={latestAnalysis.decision.candidateMatch} />
              <GateItem label="Confirmed" pass={latestAnalysis.decision.confirmedMatch} />
              <GateItem label="By Votes" pass={latestAnalysis.decision.confirmedByVotes} />
              <GateItem label="By Streak" pass={latestAnalysis.decision.confirmedByNearStreak} />
              <GateItem label="Cooldown" pass={!latestAnalysis.decision.cooldownActive} />
            </div>
          </div>

          {/* Voting */}
          <div className="border-t border-[#333] pt-3 text-xs text-[#999] space-y-1">
            <p>Votes: {latestAnalysis.decision.voteCount} / {latestAnalysis.decision.requiredVotes} (window: {latestAnalysis.decision.windowSize})</p>
            <p>Near streak: {latestAnalysis.decision.nearConsecutive} / {latestAnalysis.decision.nearStreakRequired}</p>
            <p>Live RMS: {latestAnalysis.decision.liveRms.toFixed(4)} | Vib RMS: {latestAnalysis.decision.liveVibRms.toFixed(4)}</p>
            {latestAnalysis.decision.cooldownActive && (
              <p className="text-amber-400">Cooldown: {(latestAnalysis.decision.cooldownRemainingMs / 1000).toFixed(1)}s remaining</p>
            )}
          </div>

          {/* ML info from telemetry */}
          {latestTelemetry?.ml_label && (
            <div className="border-t border-[#333] pt-3">
              <p className="text-xs text-[#999]">
                ESP32 ML: <span className="text-[#e0e0e0]">{latestTelemetry.ml_label}</span>
                {latestTelemetry.ml_confidence != null && (
                  <span> ({(latestTelemetry.ml_confidence * 100).toFixed(0)}%)</span>
                )}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function GateItem({ label, pass }: { label: string; pass: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${pass ? 'bg-green-500' : 'bg-red-500'}`} />
      <span className="text-[#999]">{label}</span>
    </div>
  );
}
