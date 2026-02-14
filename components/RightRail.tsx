import React from 'react';
import { RECENT_INCIDENTS } from '../constants';
import { AlertTriangle, TrendingUp, Zap } from 'lucide-react';

const RightRail: React.FC = () => {
  return (
    <aside className="w-full lg:w-80 h-1/3 lg:h-full bg-graphite-800 border-t lg:border-t-0 lg:border-l border-graphite-700 flex flex-col shrink-0">
      <div className="p-4 border-b border-graphite-700 sticky top-0 bg-graphite-800 z-10">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            CANLI AKIŞ
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Top Anomalies Section */}
        <section>
            <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider flex items-center justify-between">
                Aktif Vakalar 
                <span className="bg-slate-700 text-white px-1.5 rounded text-[10px]">{RECENT_INCIDENTS.length}</span>
            </h4>
            
            <div className="space-y-3">
                {RECENT_INCIDENTS.map((inc) => (
                    <div key={inc.id} className="bg-graphite-900 border border-slate-800 p-3 rounded-lg hover:border-slate-600 transition-colors cursor-pointer group">
                        <div className="flex justify-between items-start mb-2">
                            <span className="font-mono text-xs text-copper-400">{inc.machineId}</span>
                            <span className="text-[10px] text-slate-500">{inc.timestamp}</span>
                        </div>
                        <p className="text-sm text-slate-200 font-medium mb-1">{inc.description}</p>
                        <div className="flex items-center gap-2">
                             <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-400">
                                {inc.affectedBand}
                             </span>
                             {inc.severity === 'CRITICAL' && <AlertTriangle size={12} className="text-magenta-core" />}
                        </div>
                    </div>
                ))}
            </div>
        </section>

        {/* Global Stats */}
        <section>
             <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Fabrika Verileri</h4>
             <div className="grid grid-cols-2 gap-2">
                 <StatCard label="Ort. Skor" value="88/100" icon={<TrendingUp size={14} />} />
                 <StatCard label="Enerji" value="4.2 MW" icon={<Zap size={14} />} />
             </div>
        </section>

         {/* Quick Actions (Simulated) */}
         <section className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 rounded-xl p-4 border border-white/5">
             <h4 className="text-sm font-bold text-white mb-2">Sistem Öngörüsü</h4>
             <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                 Hat-4 CNC tezgahı harmoniklerinde kayma tespit edildi. 
                 <br/><br/>
                 Haftasonu duruşunda titreşim analizi ve iş mili kontrolü önerilir.
             </p>
             <button className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-xs text-white rounded transition-colors">
                 Hat-4 Analizini Gör
             </button>
         </section>

      </div>
    </aside>
  );
};

const StatCard = ({ label, value, icon }: any) => (
    <div className="bg-graphite-900 border border-slate-800 p-3 rounded-lg">
        <div className="text-slate-500 mb-1">{icon}</div>
        <div className="text-lg font-bold text-slate-200">{value}</div>
        <div className="text-[10px] text-slate-500 uppercase">{label}</div>
    </div>
);

export default RightRail;
