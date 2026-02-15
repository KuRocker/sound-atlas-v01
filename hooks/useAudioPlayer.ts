import { useState, useRef, useCallback, useEffect } from 'react';

export function useAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playerFft, setPlayerFft] = useState<number[]>([]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef(0);
  const bufferRef = useRef<AudioBuffer | null>(null);

  const getContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }, []);

  const stop = useCallback(() => {
    try { sourceRef.current?.stop(); } catch {}
    sourceRef.current = null;
    setIsPlaying(false);
    setCurrentTime(0);
    cancelAnimationFrame(animFrameRef.current);
  }, []);

  const loadFile = useCallback(async (url: string) => {
    stop();
    const ctx = getContext();
    const resp = await fetch(url);
    const arrayBuffer = await resp.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    bufferRef.current = audioBuffer;
    setDuration(audioBuffer.duration);
  }, [getContext, stop]);

  const play = useCallback(() => {
    if (!bufferRef.current) return;
    stop();
    const ctx = getContext();
    const source = ctx.createBufferSource();
    source.buffer = bufferRef.current;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyserRef.current = analyser;

    source.connect(analyser);
    analyser.connect(ctx.destination);
    source.start(0);
    sourceRef.current = source;
    startTimeRef.current = ctx.currentTime;
    setIsPlaying(true);

    source.onended = () => {
      setIsPlaying(false);
      cancelAnimationFrame(animFrameRef.current);
    };

    const update = () => {
      if (!analyserRef.current) return;
      const data = new Float32Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getFloatFrequencyData(data);
      setPlayerFft(Array.from(data));
      setCurrentTime(ctx.currentTime - startTimeRef.current);
      animFrameRef.current = requestAnimationFrame(update);
    };
    update();
  }, [getContext, stop]);

  useEffect(() => {
    return () => {
      stop();
      audioCtxRef.current?.close();
    };
  }, [stop]);

  return { isPlaying, currentTime, duration, playerFft, loadFile, play, stop };
}
