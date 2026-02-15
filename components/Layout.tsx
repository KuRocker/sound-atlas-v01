import React from 'react';
import { Layers, Activity, Radio, Database, Settings, Bell, Search, Volume2, Loader2, Wifi, WifiOff } from 'lucide-react';
import { useAppState } from '../store/AppContext';

interface LayoutProps {
  children: React.ReactNode;
  activeView: string;
  onNavigate: (view: string) => void;
  onPlaySummary?: () => void;
  isGeneratingAudio?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, activeView, onNavigate, onPlaySummary, isGeneratingAudio }) => {
  let esp32Connected = false;
  try {
    const state = useAppState();
    esp32Connected = state.esp32Status?.connected || false;
  } catch { /* AppProvider not mounted yet */ }

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen bg-graphite-900 text-slate-300 font-sans overflow-hidden">
      {/* Sidebar - Desktop: Left, Mobile: Bottom Navigation */}
      <aside className="fixed bottom-0 w-full h-16 md:relative md:w-16 md:h-full md:flex-col flex flex-row items-center justify-around md:justify-start py-2 md:py-6 border-t md:border-t-0 md:border-r border-graphite-700 bg-graphite-800 z-50 order-2 md:order-1 safe-area-bottom">
        <div className="hidden md:block mb-8 font-bold text-xl tracking-widest text-silver-400 rotate-90 origin-center whitespace-nowrap mt-4">
          ATLAS
        </div>
        
        <nav className="flex flex-row md:flex-col gap-1 md:gap-6 w-full items-center justify-around md:justify-start">
          <NavItem icon={<Layers size={20} />} label="Harita" active={activeView === 'map'} onClick={() => onNavigate('map')} />
          <NavItem icon={<Activity size={20} />} label="Vakalar" active={activeView === 'cases'} onClick={() => onNavigate('cases')} />
          <NavItem icon={<Radio size={20} />} label="Stüdyo" active={activeView === 'studio'} onClick={() => onNavigate('studio')} />
          <NavItem icon={<Database size={20} />} label="Cihazlar" active={activeView === 'devices'} onClick={() => onNavigate('devices')} />
        </nav>

        <div className="hidden md:flex mt-auto flex-col gap-6 w-full items-center">
             <button className="p-3 text-slate-500 hover:text-white transition-colors">
                <Settings size={20} />
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-700 to-slate-600 border border-slate-500"></div>
        </div>
      </aside>

      {/* Ana İçerik Alanı */}
      <main className="flex-1 flex flex-col relative overflow-hidden order-1 md:order-2 mb-16 md:mb-0">
        {/* Üst Başlık */}
        <header className="h-14 shrink-0 border-b border-graphite-700 bg-graphite-900/90 backdrop-blur flex items-center justify-between px-4 md:px-6 z-40">
            <div className="flex items-center gap-4">
                <h1 className="text-lg font-bold tracking-tight text-white">SOUND<span className="font-light text-slate-400">ATLAS</span></h1>
                <div className="hidden sm:block h-4 w-[1px] bg-slate-700 mx-2"></div>
                <span className="hidden sm:inline text-xs font-mono text-copper-400">SAHA: TR-BURSA-TEKSTİL</span>
            </div>

            <div className="flex items-center gap-2 md:gap-6">
                {/* Sesli Özet Butonu */}
                <button 
                  onClick={onPlaySummary}
                  disabled={isGeneratingAudio}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${isGeneratingAudio ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-magenta-core hover:text-white'}`}
                >
                  {isGeneratingAudio ? <Loader2 size={14} className="animate-spin" /> : <Volume2 size={14} />}
                  <span className="hidden sm:inline text-xs font-medium">Saha Özeti</span>
                </button>

                <div className="relative hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                    <input 
                        type="text" 
                        placeholder="Makine ID ara..." 
                        className="bg-graphite-800 border border-slate-700 rounded-full py-1.5 pl-9 pr-4 text-xs focus:outline-none focus:border-slate-500 w-64 transition-all"
                    />
                </div>
                <span className="flex items-center gap-1.5 text-xs" title={esp32Connected ? 'ESP32 Connected' : 'ESP32 Disconnected'}>
                  {esp32Connected ? <Wifi size={14} className="text-green-400" /> : <WifiOff size={14} className="text-slate-600" />}
                  <span className={`hidden sm:inline ${esp32Connected ? 'text-green-400' : 'text-slate-600'}`}>
                    {esp32Connected ? 'ESP32' : 'No Device'}
                  </span>
                </span>
                <button className="relative text-slate-400 hover:text-white">
                    <Bell size={18} />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-magenta-core rounded-full animate-pulse"></span>
                </button>
            </div>
        </header>

        {/* Görüntüleme Alanı */}
        <div className="flex-1 relative overflow-hidden flex flex-col">
            {children}
        </div>
      </main>
    </div>
  );
};

const NavItem: React.FC<{ icon: React.ReactNode, label: string, active: boolean, onClick: () => void }> = ({ icon, label, active, onClick }) => (
    <button 
        onClick={onClick}
        title={label}
        className={`group relative p-3 rounded-xl transition-all ${active ? 'bg-slate-700/50 text-magenta-core' : 'text-slate-500 hover:text-slate-200'}`}
    >
        {icon}
        {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-magenta-core rounded-r-full hidden md:block"></div>}
        {active && <div className="absolute top-0 left-1/2 -translate-x-1/2 h-1 w-8 bg-magenta-core rounded-b-full md:hidden"></div>}
    </button>
);

export default Layout;
