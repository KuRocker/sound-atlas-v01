import React from 'react';
import { SpectrumCanvas } from './SpectrumCanvas';
import { AudioMetrics } from './AudioMetrics';
import { AudioPlayer } from './AudioPlayer';
import { FileUpload } from './FileUpload';
import { SoundLibrary } from './SoundLibrary';

export function StudioView() {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-[#e0e0e0]">Studio</h1>
      <SpectrumCanvas />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <AudioMetrics />
          <AudioPlayer />
        </div>
        <div className="space-y-6">
          <FileUpload />
          <SoundLibrary />
        </div>
      </div>
    </div>
  );
}
