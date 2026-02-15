import React, { useState, useCallback, useRef } from 'react';

export function FileUpload() {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File) => {
    setUploading(true);
    setMessage('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/fault-sounds/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) {
        setMessage(`Error: ${data.error}`);
      } else {
        setMessage(`Uploaded: ${data.filename} → Reference created`);
      }
    } catch (e) {
      setMessage('Upload failed');
    }
    setUploading(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  return (
    <div className="bg-[#16213e] border border-[#333] rounded-xl p-5 space-y-3">
      <h2 className="text-lg font-semibold text-[#e0e0e0]">Upload Sound</h2>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-[#d4a574] bg-[#d4a574]/10' : 'border-[#444] hover:border-[#666]'
        }`}
      >
        <p className="text-[#999] text-sm">
          {uploading ? 'Uploading...' : 'Drop audio file here or click to browse'}
        </p>
        <p className="text-[#666] text-xs mt-1">.wav, .mp3, .ogg, .m4a</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".wav,.mp3,.ogg,.m4a"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadFile(file);
        }}
      />

      {message && (
        <p className={`text-xs ${message.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
          {message}
        </p>
      )}
    </div>
  );
}
