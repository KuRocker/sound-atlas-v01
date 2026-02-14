import React, { useState } from 'react';
import Layout from './components/Layout';
import AcousticMap from './components/AcousticMap';
import RightRail from './components/RightRail';
import MachineProfile from './components/MachineProfile';
import { Machine } from './types';
import { AlertCircle } from 'lucide-react';
import { MOCK_MACHINES, RECENT_INCIDENTS } from './constants';
import { GoogleGenAI, Modality } from "@google/genai";

const App: React.FC = () => {
  const [activeView, setActiveView] = useState('map');
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);

  const handleMachineSelect = (machine: Machine) => {
    setSelectedMachine(machine);
  };

  const handleCloseProfile = () => {
    setSelectedMachine(null);
  };

  // Sesli Özet Oluşturma ve Oynatma
  const handlePlaySummary = async () => {
    if (isGeneratingAudio) return;
    setIsGeneratingAudio(true);

    try {
      // 1. Mevcut veriden özet metin oluştur
      const criticalCount = MOCK_MACHINES.filter(m => m.status === 'CRITICAL').length;
      const warningCount = MOCK_MACHINES.filter(m => m.status === 'WARNING').length;
      const total = MOCK_MACHINES.length;
      const latestIncident = RECENT_INCIDENTS[0];

      const promptText = `
        Şu metni Türkçe olarak, profesyonel bir endüstriyel asistan tonunda seslendir:
        "SOUNDATLAS Paneli özeti: Bursa Tekstil sahasında şu an ${total} makine izleniyor.
        Arayüzde ${criticalCount} adet kritik, ${warningCount} adet uyarı seviyesinde alarm var.
        Özellikle ${latestIncident.machineId} makinesindeki ${latestIncident.description} durumu aciliyet taşıyor.
        Sağ panelde toplam ${RECENT_INCIDENTS.length} aktif vaka ve canlı enerji tüketim verileri listelenmektedir."
      `;

      // 2. Gemini API'yi başlat
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      // 3. TTS İsteği gönder
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: promptText }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' }, // Kore, Fenrir, Puck, Charon
            },
          },
        },
      });

      // 4. Sesi Çöz ve Oynat
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const audioBuffer = await decodeAudioData(
          decode(base64Audio),
          audioContext,
          24000,
          1
        );
        
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();
      }

    } catch (error) {
      console.error("Audio generation failed:", error);
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  // Render content based on active view
  const renderContent = () => {
    switch (activeView) {
      case 'map':
        return (
          <div className="flex flex-col lg:flex-row h-full">
            <div className="flex-1 relative min-h-0">
              <AcousticMap 
                onMachineSelect={handleMachineSelect} 
                selectedMachineId={selectedMachine?.id || null} 
              />
              {/* Overlay Profile */}
              {selectedMachine && (
                <MachineProfile machine={selectedMachine} onClose={handleCloseProfile} />
              )}
            </div>
            <RightRail />
          </div>
        );
      case 'cases':
      case 'studio':
      case 'devices':
        return (
          <div className="flex items-center justify-center h-full bg-graphite-900 text-slate-500 flex-col gap-4">
            <AlertCircle size={48} className="opacity-50" />
            <h2 className="text-xl font-mono uppercase tracking-widest">
                {activeView === 'cases' ? 'VAKA YÖNETİMİ' : activeView === 'studio' ? 'MODEL STÜDYOSU' : 'CİHAZLAR'} MODÜLÜ YAPIM AŞAMASINDA
            </h2>
            <p className="text-sm max-w-md text-center">
                Akustik imza görselleştirme motoru şu anda Harita görünümünde aktiftir.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Layout 
      activeView={activeView} 
      onNavigate={setActiveView} 
      onPlaySummary={handlePlaySummary}
      isGeneratingAudio={isGeneratingAudio}
    >
      {renderContent()}
    </Layout>
  );
};

// --- Audio Helper Functions ---

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export default App;
