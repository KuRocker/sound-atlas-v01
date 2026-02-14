import React, { useState } from 'react';
import { Machine, MachineStatus } from '../types';
import { X, Play, Activity, History, Fingerprint, ArrowRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface MachineProfileProps {
  machine: Machine;
  onClose: () => void;
}

// Akustik kontur için örnek veri
const MOCK_SIGNATURE = Array.from({ length: 50 }, (_, i) => ({
  freq: i * 200, // 0 to 10kHz
  normal: 20 + Math.sin(i / 5) * 10 + Math.random() * 5,
  current: 20 + Math.sin(i / 5) * 10 + (i > 30 ? 40 : Math.random() * 15), // Yüksek frekansta anomali
}));

const MachineProfile: React.FC<MachineProfileProps> = ({ machine, onClose }) => {
  const [activeTab, setActiveTab] = useState<'pulse' | 'signature' | 'timeline'>('pulse');

  // Durum çevirisi
  const getStatusText = (status: string) => {
      switch(status) {
          case 'CRITICAL': return 'KRİTİK';
          case 'WARNING': return 'UYARI';
          case 'NORMAL': return 'NORMAL';
          default: return status;
      }
  };

  return (
    <div className="fixed inset-0 z-50 md:absolute md:inset-auto md:top-4 md:left-4 md:bottom-4 md:w-[480px] bg-graphite-800/95 backdrop-blur-md border border-slate-700 md:rounded-2xl shadow-2xl flex flex-col overflow-hidden transform transition-all duration-300">
      
      {/* Başlık */}
      <div className="p-4 md:p-6 border-b border-slate-700 flex justify-between items-start shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <span className="font-mono text-xs text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">{machine.id}</span>
             <span className={`text-xs font-bold px-2 py-0.5 rounded ${machine.status === 'CRITICAL' ? 'bg-magenta-dim/20 text-magenta-core' : 'bg-slate-700 text-slate-300'}`}>
                {getStatusText(machine.status)}
             </span>
          </div>
          <h2 className="text-xl font-bold text-white">{machine.name}</h2>
          <p className="text-xs text-slate-400 mt-1">{machine.type} • Son senkronizasyon: {machine.lastUpdate}</p>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-2 bg-slate-800 rounded-full">
          <X size={20} />
        </button>
      </div>

      {/* Sekmeler */}
      <div className="flex border-b border-slate-700 px-4 md:px-6 gap-4 md:gap-6 shrink-0 overflow-x-auto">
        <TabButton label="Nabız" icon={<Activity size={14} />} active={activeTab === 'pulse'} onClick={() => setActiveTab('pulse')} />
        <TabButton label="Ses İmzası" icon={<Fingerprint size={14} />} active={activeTab === 'signature'} onClick={() => setActiveTab('signature')} />
        <TabButton label="Geçmiş" icon={<History size={14} />} active={activeTab === 'timeline'} onClick={() => setActiveTab('timeline')} />
      </div>

      {/* İçerik */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin">
        
        {activeTab === 'pulse' && (
          <div className="space-y-6">
             {/* Anomali Skoru */}
             <div className="bg-graphite-900 rounded-xl p-4 border border-slate-800 relative overflow-hidden">
                <div className="flex justify-between items-end relative z-10">
                    <div>
                        <span className="text-xs text-slate-500 block mb-1">CANLI ANOMALİ SKORU</span>
                        <span className={`text-4xl font-mono font-bold ${machine.score > 80 ? 'text-magenta-core' : 'text-silver-400'}`}>
                            {machine.score}<span className="text-sm opacity-50">/100</span>
                        </span>
                    </div>
                    <div className="text-right">
                         <div className="text-xs text-copper-400 flex items-center gap-1 justify-end">
                            <span className="w-2 h-2 rounded-full bg-copper-400 animate-pulse"></span>
                            Sapma Tespit Ediliyor
                         </div>
                    </div>
                </div>
                {/* Arkaplan Sparkline Efekti */}
                <div className="absolute bottom-0 left-0 right-0 h-16 opacity-20 pointer-events-none">
                     <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={MOCK_SIGNATURE}>
                             <Area type="monotone" dataKey="current" stroke={machine.score > 80 ? '#d600ff' : '#94a3b8'} fill={machine.score > 80 ? '#d600ff' : '#94a3b8'} />
                        </AreaChart>
                     </ResponsiveContainer>
                </div>
             </div>

             {/* Bant Analizi */}
             <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Frekans Bant Analizi</h3>
                <BandRow label="Düşük (0-500Hz)" value={machine.bands.low} status="normal" />
                <BandRow label="Orta (0.5-2kHz)" value={machine.bands.mid} status={machine.faultType === 'CAVITATION' ? 'warning' : 'normal'} />
                <BandRow label="Yüksek (2-10kHz)" value={machine.bands.high} status={machine.faultType === 'BEARING' ? 'critical' : 'normal'} />
             </div>

             {/* Önerilen Aksiyon */}
             {machine.status !== MachineStatus.NORMAL && (
                 <div className="bg-slate-800/50 border-l-2 border-magenta-core p-4 rounded-r">
                    <h4 className="text-sm font-bold text-white mb-1">Önerilen Aksiyon</h4>
                    <p className="text-xs text-slate-400 mb-3">
                        Yüksek frekans enerji artışı, rulman iç bilezik aşınmasının erken safhasını işaret ediyor.
                    </p>
                    <button className="bg-slate-700 hover:bg-slate-600 text-white text-xs px-3 py-2 rounded flex items-center gap-2 transition-colors w-full md:w-auto justify-center md:justify-start">
                        <span>Bakım Kaydı Oluştur</span>
                        <ArrowRight size={12} />
                    </button>
                 </div>
             )}
          </div>
        )}

        {activeTab === 'signature' && (
             <div className="h-full flex flex-col min-h-[300px]">
                 <div className="flex justify-between items-center mb-4">
                     <span className="text-xs text-slate-500">Karşılaştırma</span>
                     <div className="flex gap-4 text-xs">
                         <span className="flex items-center gap-1 text-slate-500"><span className="w-2 h-2 bg-slate-600 rounded-full"></span> Referans</span>
                         <span className="flex items-center gap-1 text-magenta-core"><span className="w-2 h-2 bg-magenta-core rounded-full"></span> Şu An</span>
                     </div>
                 </div>
                 
                 <div className="flex-1 bg-graphite-900 border border-slate-800 rounded-xl relative overflow-hidden min-h-[200px]">
                     {/* Akustik Kontur Görselleştirici */}
                     <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={MOCK_SIGNATURE} margin={{top: 20, right: 0, left: -20, bottom: 0}}>
                             <defs>
                                 <linearGradient id="gradCurrent" x1="0" y1="0" x2="0" y2="1">
                                     <stop offset="5%" stopColor="#d600ff" stopOpacity={0.3}/>
                                     <stop offset="95%" stopColor="#d600ff" stopOpacity={0}/>
                                 </linearGradient>
                             </defs>
                             <XAxis dataKey="freq" tick={{fontSize: 10, fill: '#64748b'}} />
                             <YAxis tick={{fontSize: 10, fill: '#64748b'}} />
                             <Tooltip 
                                contentStyle={{backgroundColor: '#161b22', border: '1px solid #334155'}}
                                labelStyle={{color: '#94a3b8'}}
                             />
                             {/* Referans Gölgesi */}
                             <Area type="monotone" dataKey="normal" stroke="#475569" fill="none" strokeWidth={2} strokeDasharray="4 4" />
                             {/* Mevcut Anomali */}
                             <Area type="monotone" dataKey="current" stroke="#d600ff" fill="url(#gradCurrent)" strokeWidth={2} />
                         </AreaChart>
                     </ResponsiveContainer>
                 </div>
                 <div className="mt-4 p-3 bg-copper-500/10 border border-copper-400/20 rounded-lg">
                    <p className="text-xs text-copper-400 font-mono">
                        Öngörü: 6kHz bandında +12dB enerji artışı. Rulman bozulma modelleriyle eşleşiyor (Güven: %94).
                    </p>
                 </div>
             </div>
        )}

        {activeTab === 'timeline' && (
            <div className="relative border-l border-slate-700 ml-3 space-y-6 pl-6 py-2">
                <TimelineItem date="Bugün, 10:42" title="Anomali Tespit Edildi" type="critical" desc="Şiddet Kritik seviyeye yükseldi. Bant 3 sapması." />
                <TimelineItem date="Dün, 14:20" title="Vardiya Raporu" type="normal" desc="Operatör sesli uyarı notu düştü." />
                <TimelineItem date="20 Eki 2023" title="Planlı Bakım" type="normal" desc="Yağlama kontrolü tamamlandı." />
                <TimelineItem date="15 Eyl 2023" title="Model Güncellemesi" type="system" desc="ML Model v2.4 Edge cihaza yüklendi." />
            </div>
        )}

      </div>
    </div>
  );
};

// Alt bileşenler
const TabButton = ({ label, icon, active, onClick }: any) => (
    <button 
        onClick={onClick}
        className={`flex items-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${active ? 'border-magenta-core text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
    >
        {icon} {label}
    </button>
);

const BandRow = ({ label, value, status }: { label: string, value: number, status: 'normal' | 'warning' | 'critical' }) => {
    let barColor = 'bg-slate-600';
    let valColor = 'text-slate-400';
    
    if (status === 'warning') { barColor = 'bg-copper-400'; valColor = 'text-copper-400'; }
    if (status === 'critical') { barColor = 'bg-magenta-core'; valColor = 'text-magenta-core'; }

    return (
        <div className="flex items-center gap-4 text-xs">
            <span className="w-24 text-slate-500">{label}</span>
            <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full ${barColor} transition-all duration-1000`} style={{ width: `${value}%` }}></div>
            </div>
            <span className={`w-8 font-mono text-right ${valColor}`}>{value}%</span>
        </div>
    );
}

const TimelineItem = ({ date, title, type, desc }: any) => (
    <div className="relative">
        <div className={`absolute -left-[29px] top-1 w-3 h-3 rounded-full border-2 border-graphite-800 ${type === 'critical' ? 'bg-magenta-core' : type === 'system' ? 'bg-indigo-500' : 'bg-slate-500'}`}></div>
        <span className="text-xs font-mono text-slate-500 mb-1 block">{date}</span>
        <h4 className="text-sm font-bold text-slate-200">{title}</h4>
        <p className="text-xs text-slate-400 mt-1">{desc}</p>
    </div>
);

export default MachineProfile;
