const fs = require('fs');

class AudioAnalyzer {
  constructor(options = {}) {
    this.targetSampleRate = options.sampleRate || 16000;
    this.fftSize = options.fftSize || 256;
    this.numBands = options.numBands || 32;
    this.minFreq = options.minFreq || 20;
    this.maxFreq = options.maxFreq || 8000;

    this.maxProfileFrames = options.maxProfileFrames || 512;
    this.profileFloorStd = options.profileFloorStd || 0.05;
    this.descriptorFloorStd = options.descriptorFloorStd || 0.03;
    this.eps = 1e-8;

    this._dftCache = null;
  }

  async analyzeWavFile(filePath) {
    const buffer = fs.readFileSync(filePath);
    const wavData = this.parseWav(buffer);

    let samples = wavData.samples;
    if (wavData.sampleRate !== this.targetSampleRate) {
      samples = this.resample(samples, wavData.sampleRate, this.targetSampleRate);
    }

    const spectral = this.collectSpectralFrames(samples);
    const fftData = this.averageFrames(spectral.frames, this.fftSize / 2);
    const fftStd = this.stdFrames(spectral.frames, fftData);

    const rms = this.calculateRMS(samples);
    const peak = this.calculatePeak(samples);
    const zcr = this.calculateZCR(samples);
    const energyBands = this.calculateEnergyBandsFromFft(fftData);
    const fftBands = this.calculateLogBands(fftData);
    const frequencies = this.getLogFrequencies();
    const profile = this.buildReferenceProfile(spectral.frames, fftData, fftStd);

    return {
      duration: samples.length / this.targetSampleRate,
      sampleRate: wavData.sampleRate,
      targetSampleRate: this.targetSampleRate,
      channels: wavData.channels,
      bitDepth: wavData.bitDepth,
      samples: samples.length,
      rms,
      peak,
      zcr,
      energyBands,
      fftData,
      fftStd,
      fftBands,
      frequencies,
      profile,
      profileFrames: spectral.frames.length
    };
  }

  parseWav(buffer) {
    const riff = buffer.toString('utf8', 0, 4);
    if (riff !== 'RIFF') {
      throw new Error('Invalid WAV file: missing RIFF header');
    }

    const wave = buffer.toString('utf8', 8, 12);
    if (wave !== 'WAVE') {
      throw new Error('Invalid WAV file: missing WAVE format');
    }

    let offset = 12;
    let fmtChunk = null;
    let dataChunk = null;

    while (offset < buffer.length - 8) {
      const chunkId = buffer.toString('utf8', offset, offset + 4);
      const chunkSize = buffer.readUInt32LE(offset + 4);

      if (chunkId === 'fmt ') {
        fmtChunk = {
          audioFormat: buffer.readUInt16LE(offset + 8),
          channels: buffer.readUInt16LE(offset + 10),
          sampleRate: buffer.readUInt32LE(offset + 12),
          byteRate: buffer.readUInt32LE(offset + 16),
          blockAlign: buffer.readUInt16LE(offset + 20),
          bitDepth: buffer.readUInt16LE(offset + 22)
        };
      } else if (chunkId === 'data') {
        dataChunk = {
          offset: offset + 8,
          size: chunkSize
        };
      }

      offset += 8 + chunkSize;
      if (chunkSize % 2 !== 0) offset += 1;
    }

    if (!fmtChunk || !dataChunk) {
      throw new Error('Invalid WAV file: missing required chunks');
    }

    if (fmtChunk.audioFormat !== 1 && fmtChunk.audioFormat !== 3) {
      throw new Error(`Unsupported WAV audio format: ${fmtChunk.audioFormat}`);
    }

    const samples = this.extractSamples(buffer, dataChunk, fmtChunk);

    return {
      ...fmtChunk,
      samples
    };
  }

  extractSamples(buffer, dataChunk, fmtChunk) {
    const { offset, size } = dataChunk;
    const { channels, bitDepth, audioFormat } = fmtChunk;
    const bytesPerSample = bitDepth / 8;
    const numSamples = Math.floor(size / (bytesPerSample * channels));

    const samples = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      let mixed = 0;
      for (let ch = 0; ch < channels; ch++) {
        const sampleOffset = offset + (i * channels + ch) * bytesPerSample;

        if (audioFormat === 3 && bitDepth === 32) {
          mixed += buffer.readFloatLE(sampleOffset);
          continue;
        }

        if (bitDepth === 16) {
          mixed += buffer.readInt16LE(sampleOffset) / 32768.0;
        } else if (bitDepth === 24) {
          const b0 = buffer.readUInt8(sampleOffset);
          const b1 = buffer.readUInt8(sampleOffset + 1);
          const b2 = buffer.readInt8(sampleOffset + 2);
          const value = (b2 << 16) | (b1 << 8) | b0;
          mixed += value / 8388608.0;
        } else if (bitDepth === 32) {
          mixed += buffer.readInt32LE(sampleOffset) / 2147483648.0;
        } else if (bitDepth === 8) {
          mixed += (buffer.readUInt8(sampleOffset) - 128) / 128.0;
        } else {
          throw new Error(`Unsupported WAV bit depth: ${bitDepth}`);
        }
      }

      samples[i] = mixed / channels;
    }

    return samples;
  }

  resample(samples, fromRate, toRate) {
    if (fromRate === toRate) return samples;

    const ratio = fromRate / toRate;
    const newLength = Math.max(1, Math.floor(samples.length / ratio));
    const out = new Float32Array(newLength);

    for (let i = 0; i < newLength; i++) {
      const srcIndex = i * ratio;
      const i0 = Math.floor(srcIndex);
      const i1 = Math.min(i0 + 1, samples.length - 1);
      const frac = srcIndex - i0;
      out[i] = samples[i0] * (1 - frac) + samples[i1] * frac;
    }

    return out;
  }

  calculateRMS(samples) {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
    return Math.sqrt(sum / Math.max(1, samples.length));
  }

  calculatePeak(samples) {
    let peak = 0;
    for (let i = 0; i < samples.length; i++) {
      const abs = Math.abs(samples[i]);
      if (abs > peak) peak = abs;
    }
    return peak;
  }

  calculateZCR(samples) {
    let crossings = 0;
    for (let i = 1; i < samples.length; i++) {
      if ((samples[i - 1] >= 0) !== (samples[i] >= 0)) crossings += 1;
    }
    return crossings / Math.max(1, samples.length);
  }

  collectSpectralFrames(samples) {
    const windowSize = this.fftSize;
    const baseHop = Math.max(1, Math.floor(windowSize / 2));

    if (samples.length < windowSize) {
      const padded = new Float32Array(windowSize);
      padded.set(samples, 0);
      const frame = this.fft(this.applyHammingWindow(padded));
      return { frames: [Array.from(frame)], hopSize: windowSize };
    }

    const maxStart = samples.length - windowSize;
    let hopSize = baseHop;
    const estimatedFrames = Math.floor(maxStart / hopSize) + 1;
    if (estimatedFrames > this.maxProfileFrames) {
      hopSize = Math.max(baseHop, Math.ceil(maxStart / Math.max(1, this.maxProfileFrames - 1)));
    }

    const frames = [];
    for (let start = 0; start <= maxStart; start += hopSize) {
      const frame = samples.subarray(start, start + windowSize);
      const windowed = this.applyHammingWindow(frame);
      const magnitude = this.fft(windowed);
      frames.push(Array.from(magnitude));
    }

    if (frames.length === 0) {
      const fallback = this.fft(this.applyHammingWindow(samples.subarray(0, windowSize)));
      frames.push(Array.from(fallback));
    }

    return { frames, hopSize };
  }

  applyHammingWindow(samples) {
    const out = new Float32Array(samples.length);
    const N = samples.length;
    if (N <= 1) {
      out[0] = samples[0] || 0;
      return out;
    }

    for (let i = 0; i < N; i++) {
      const w = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (N - 1));
      out[i] = samples[i] * w;
    }

    return out;
  }

  getDftCache(N) {
    if (this._dftCache && this._dftCache.N === N) return this._dftCache;

    const half = Math.floor(N / 2);
    const size = half * N;
    const cos = new Float32Array(size);
    const sin = new Float32Array(size);

    for (let k = 0; k < half; k++) {
      const base = k * N;
      for (let n = 0; n < N; n++) {
        const angle = (-2 * Math.PI * k * n) / N;
        cos[base + n] = Math.cos(angle);
        sin[base + n] = Math.sin(angle);
      }
    }

    this._dftCache = { N, cos, sin };
    return this._dftCache;
  }

  fft(samples) {
    const N = samples.length;
    const half = Math.floor(N / 2);
    const out = new Float32Array(half);
    const cache = this.getDftCache(N);

    for (let k = 0; k < half; k++) {
      let real = 0;
      let imag = 0;
      const base = k * N;
      for (let n = 0; n < N; n++) {
        const x = samples[n];
        real += x * cache.cos[base + n];
        imag += x * cache.sin[base + n];
      }
      out[k] = Math.sqrt(real * real + imag * imag) / N;
    }

    return out;
  }

  averageFrames(frames, length) {
    const avg = new Float32Array(length);
    if (!frames || frames.length === 0) return Array.from(avg);

    for (const frame of frames) {
      for (let i = 0; i < length; i++) {
        avg[i] += Number(frame[i]) || 0;
      }
    }

    const inv = 1 / frames.length;
    for (let i = 0; i < length; i++) avg[i] *= inv;

    return Array.from(avg);
  }

  stdFrames(frames, mean) {
    const len = mean.length;
    const std = new Float32Array(len);
    if (!frames || frames.length <= 1) {
      std.fill(this.profileFloorStd);
      return Array.from(std);
    }

    for (const frame of frames) {
      for (let i = 0; i < len; i++) {
        const d = (Number(frame[i]) || 0) - mean[i];
        std[i] += d * d;
      }
    }

    const denom = 1 / (frames.length - 1);
    for (let i = 0; i < len; i++) {
      std[i] = Math.max(this.profileFloorStd, Math.sqrt(std[i] * denom));
    }

    return Array.from(std);
  }

  calculateEnergyBandsFromFft(fftData) {
    const binWidth = this.targetSampleRate / (fftData.length * 2);
    let e1 = 0;
    let e2 = 0;
    let e3 = 0;

    for (let i = 1; i < fftData.length; i++) {
      const freq = i * binWidth;
      const p = (Number(fftData[i]) || 0) ** 2;
      if (freq >= 200 && freq < 800) e1 += p;
      else if (freq >= 800 && freq < 2000) e2 += p;
      else if (freq >= 2000 && freq < 4000) e3 += p;
    }

    return {
      e_200_800: e1,
      e_800_2k: e2,
      e_2k_4k: e3
    };
  }

  calculateLogBands(fftData) {
    const bands = new Float32Array(this.numBands);
    const logMin = Math.log10(this.minFreq);
    const logMax = Math.log10(Math.min(this.maxFreq, this.targetSampleRate / 2));
    const logStep = (logMax - logMin) / this.numBands;
    const binWidth = this.targetSampleRate / (fftData.length * 2);

    for (let i = 0; i < this.numBands; i++) {
      const f0 = 10 ** (logMin + i * logStep);
      const f1 = 10 ** (logMin + (i + 1) * logStep);

      let start = Math.floor(f0 / binWidth);
      let end = Math.floor(f1 / binWidth);
      start = Math.max(1, Math.min(start, fftData.length - 1));
      end = Math.max(start, Math.min(end, fftData.length - 1));

      let sum = 0;
      let count = 0;
      for (let k = start; k <= end; k++) {
        sum += Number(fftData[k]) || 0;
        count += 1;
      }
      bands[i] = count > 0 ? sum / count : 0;
    }

    return Array.from(bands);
  }

  getLogFrequencies() {
    const frequencies = [];
    const logMin = Math.log10(this.minFreq);
    const logMax = Math.log10(Math.min(this.maxFreq, this.targetSampleRate / 2));
    const logStep = (logMax - logMin) / this.numBands;

    for (let i = 0; i < this.numBands; i++) {
      frequencies.push(10 ** (logMin + i * logStep));
    }

    return frequencies;
  }

  sanitizeSpectrum(input, targetLength = null) {
    if (!Array.isArray(input) && !(input instanceof Float32Array)) return [];

    const len = targetLength == null ? input.length : Math.min(targetLength, input.length);
    const out = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const v = Number(input[i]);
      out[i] = Number.isFinite(v) ? Math.max(0, v) : 0;
    }

    return Array.from(out);
  }

  smoothSpectrum(arr) {
    const len = arr.length;
    if (len < 3) return arr.slice();

    const smoothed = new Float32Array(len);
    smoothed[0] = (arr[0] + arr[1]) / 2;
    for (let i = 1; i < len - 1; i++) {
      smoothed[i] = (arr[i - 1] + arr[i] + arr[i + 1]) / 3;
    }
    smoothed[len - 1] = (arr[len - 2] + arr[len - 1]) / 2;

    return Array.from(smoothed);
  }

  standardize(arr) {
    const len = arr.length;
    if (len === 0) return [];

    let mean = 0;
    for (let i = 0; i < len; i++) mean += arr[i];
    mean /= len;

    let variance = 0;
    for (let i = 0; i < len; i++) {
      const d = arr[i] - mean;
      variance += d * d;
    }
    variance /= len;

    const std = Math.sqrt(Math.max(this.eps, variance));
    return arr.map((x) => (x - mean) / std);
  }

  l2Normalize(arr) {
    let norm = 0;
    for (let i = 0; i < arr.length; i++) norm += arr[i] * arr[i];
    norm = Math.sqrt(norm);
    if (norm <= this.eps) return arr.map(() => 0);
    return arr.map((x) => x / norm);
  }

  prepareSpectrumVector(rawSpectrum) {
    const clean = this.sanitizeSpectrum(rawSpectrum);
    if (clean.length === 0) return [];

    const smoothed = this.smoothSpectrum(clean);
    const compressed = smoothed.map((v, idx) => {
      if (idx === 0) return 0;
      return Math.log1p(v);
    });

    const standardized = this.standardize(compressed);
    return this.l2Normalize(standardized);
  }

  extractDescriptorsFromSpectrum(rawSpectrum) {
    const spectrum = this.sanitizeSpectrum(rawSpectrum);
    const n = spectrum.length;
    if (n === 0) return [0, 0, 0, 0, 0, 0, 0, 0];

    const nyquist = this.targetSampleRate / 2;
    const binHz = nyquist / n;

    let sum = 0;
    let sumF = 0;
    let sumF2 = 0;
    let max = 0;
    let logSum = 0;
    let low = 0;
    let mid = 0;
    let high = 0;

    for (let i = 1; i < n; i++) {
      const mag = Math.max(this.eps, spectrum[i]);
      const freq = i * binHz;
      sum += mag;
      sumF += freq * mag;
      sumF2 += freq * freq * mag;
      max = Math.max(max, mag);
      logSum += Math.log(mag);

      if (freq < 800) low += mag;
      else if (freq < 2500) mid += mag;
      else high += mag;
    }

    if (sum <= this.eps) return [0, 0, 0, 0, 0, 0, 0, 0];

    const centroid = sumF / sum;
    const variance = Math.max(0, sumF2 / sum - centroid * centroid);
    const bandwidth = Math.sqrt(variance);

    const rollTarget = 0.85 * sum;
    let cumulative = 0;
    let rolloff = nyquist;
    for (let i = 1; i < n; i++) {
      cumulative += Math.max(this.eps, spectrum[i]);
      if (cumulative >= rollTarget) {
        rolloff = i * binHz;
        break;
      }
    }

    const avg = sum / Math.max(1, n - 1);
    const flatness = Math.exp(logSum / Math.max(1, n - 1)) / Math.max(this.eps, avg);
    const crest = max / Math.max(this.eps, avg);

    const totalBand = low + mid + high + this.eps;

    return [
      centroid / nyquist,
      bandwidth / nyquist,
      rolloff / nyquist,
      Math.max(0, Math.min(1, flatness)),
      Math.log1p(crest) / Math.log(32),
      low / totalBand,
      mid / totalBand,
      high / totalBand
    ];
  }

  meanVector(vectors, length) {
    const mean = new Float32Array(length);
    if (!vectors || vectors.length === 0) return Array.from(mean);

    for (const vec of vectors) {
      for (let i = 0; i < length; i++) mean[i] += Number(vec[i]) || 0;
    }

    const inv = 1 / vectors.length;
    for (let i = 0; i < length; i++) mean[i] *= inv;

    return Array.from(mean);
  }

  stdVector(vectors, mean, floorStd) {
    const len = mean.length;
    const std = new Float32Array(len);
    if (!vectors || vectors.length <= 1) {
      std.fill(floorStd);
      return Array.from(std);
    }

    for (const vec of vectors) {
      for (let i = 0; i < len; i++) {
        const d = (Number(vec[i]) || 0) - mean[i];
        std[i] += d * d;
      }
    }

    const denom = 1 / (vectors.length - 1);
    for (let i = 0; i < len; i++) {
      std[i] = Math.max(floorStd, Math.sqrt(std[i] * denom));
    }

    return Array.from(std);
  }

  buildReferenceProfile(frames, meanFft, stdFft) {
    const preparedFrames = frames.map((frame) => this.prepareSpectrumVector(frame));
    const descFrames = frames.map((frame) => this.extractDescriptorsFromSpectrum(frame));

    const vectorMean = this.meanVector(preparedFrames, meanFft.length);
    const vectorStd = this.stdVector(preparedFrames, vectorMean, this.profileFloorStd);

    const descriptorMean = this.meanVector(descFrames, 8);
    const descriptorStd = this.stdVector(descFrames, descriptorMean, this.descriptorFloorStd);

    return {
      model: 'spectral-profile-v1',
      frameCount: frames.length,
      vectorMean,
      vectorStd,
      descriptorMean,
      descriptorStd,
      meanFft: meanFft.slice(),
      stdFft: stdFft.slice()
    };
  }

  cosineSimilarity(a, b) {
    const len = Math.min(a.length, b.length);
    if (len === 0) return 0;

    let dot = 0;
    let na = 0;
    let nb = 0;

    for (let i = 0; i < len; i++) {
      const x = a[i];
      const y = b[i];
      dot += x * y;
      na += x * x;
      nb += y * y;
    }

    if (na <= this.eps || nb <= this.eps) return 0;
    return dot / Math.sqrt(na * nb);
  }

  pearsonCorrelation(a, b) {
    const len = Math.min(a.length, b.length);
    if (len === 0) return 0;

    let meanA = 0;
    let meanB = 0;
    for (let i = 0; i < len; i++) {
      meanA += a[i];
      meanB += b[i];
    }
    meanA /= len;
    meanB /= len;

    let cov = 0;
    let varA = 0;
    let varB = 0;

    for (let i = 0; i < len; i++) {
      const da = a[i] - meanA;
      const db = b[i] - meanB;
      cov += da * db;
      varA += da * da;
      varB += db * db;
    }

    if (varA <= this.eps || varB <= this.eps) return 0;
    return cov / Math.sqrt(varA * varB);
  }

  descriptorSimilarity(descA, descB) {
    const len = Math.min(descA.length, descB.length);
    if (len === 0) return 0;

    let dist2 = 0;
    for (let i = 0; i < len; i++) {
      const d = descA[i] - descB[i];
      dist2 += d * d;
    }

    return Math.exp(-(2.0 * dist2) / len);
  }

  profileDistanceScore(sample, mean, std) {
    const len = Math.min(sample.length, mean.length, std.length);
    if (len === 0) return 0;

    let zSum = 0;
    for (let i = 0; i < len; i++) {
      const denom = Math.max(this.eps, std[i]);
      zSum += Math.abs(sample[i] - mean[i]) / denom;
    }

    const z = zSum / len;
    return Math.exp(-0.45 * z);
  }

  normalizeProfile(reference, length) {
    const profile = reference && reference.profile ? reference.profile : null;
    if (!profile) return null;

    if (!Array.isArray(profile.vectorMean) || !Array.isArray(profile.vectorStd)) return null;
    if (!Array.isArray(profile.descriptorMean) || !Array.isArray(profile.descriptorStd)) return null;

    return {
      vectorMean: this.sanitizeSpectrum(profile.vectorMean, length),
      vectorStd: this.sanitizeSpectrum(profile.vectorStd, length).map((v) => Math.max(this.profileFloorStd, v)),
      descriptorMean: profile.descriptorMean.slice(0, 8).map((v) => Number(v) || 0),
      descriptorStd: profile.descriptorStd.slice(0, 8).map((v) => Math.max(this.descriptorFloorStd, Number(v) || 0))
    };
  }

  compareToReference(liveFft, reference) {
    const refSpectrumRaw = Array.isArray(reference)
      ? reference
      : Array.isArray(reference?.fft)
        ? reference.fft
        : null;

    const liveSpectrumRaw = Array.isArray(liveFft) ? liveFft : null;

    if (!liveSpectrumRaw || !refSpectrumRaw || liveSpectrumRaw.length === 0 || refSpectrumRaw.length === 0) {
      return {
        similarity: 0,
        difference: 1,
        components: {
          cosine: 0,
          correlation: 0,
          rbf: 0,
          descriptor: 0,
          profile: 0,
          distance: 1
        }
      };
    }

    const len = Math.min(liveSpectrumRaw.length, refSpectrumRaw.length);
    const liveSpectrum = this.sanitizeSpectrum(liveSpectrumRaw, len);
    const refSpectrum = this.sanitizeSpectrum(refSpectrumRaw, len);

    const liveVec = this.prepareSpectrumVector(liveSpectrum);
    const refVec = this.prepareSpectrumVector(refSpectrum);

    const cosine = this.cosineSimilarity(liveVec, refVec);
    const correlation = this.pearsonCorrelation(liveVec, refVec);

    let dist2 = 0;
    for (let i = 0; i < len; i++) {
      const d = liveVec[i] - refVec[i];
      dist2 += d * d;
    }
    dist2 /= len;

    const rbf = Math.exp(-1.8 * dist2);

    const liveDesc = this.extractDescriptorsFromSpectrum(liveSpectrum);
    const refDesc = this.extractDescriptorsFromSpectrum(refSpectrum);
    const descriptor = this.descriptorSimilarity(liveDesc, refDesc);

    const profile = this.normalizeProfile(reference, len);
    let profileScore;
    if (profile) {
      const vecScore = this.profileDistanceScore(liveVec, profile.vectorMean, profile.vectorStd);
      const descScore = this.profileDistanceScore(liveDesc, profile.descriptorMean, profile.descriptorStd);
      profileScore = 0.72 * vecScore + 0.28 * descScore;
    } else {
      profileScore = 0.6 * ((cosine + 1) / 2) + 0.4 * descriptor;
    }

    const cosine01 = (cosine + 1) / 2;
    const corr01 = (correlation + 1) / 2;
    // Zero-correlation baseline (0.5) should not contribute as real similarity.
    // This suppresses false positives in low-energy / silence-like spectra.
    const cosinePositive = this.clamp01((cosine01 - 0.5) * 2);
    const correlationPositive = this.clamp01((corr01 - 0.5) * 2);

    const similarity = this.clamp01(
      0.34 * cosinePositive +
      0.24 * correlationPositive +
      0.18 * rbf +
      0.14 * descriptor +
      0.10 * profileScore
    );

    return {
      similarity,
      difference: 1 - similarity,
      components: {
        cosine: this.clamp01(cosine01),
        correlation: this.clamp01(corr01),
        cosinePositive: this.clamp01(cosinePositive),
        correlationPositive: this.clamp01(correlationPositive),
        rbf: this.clamp01(rbf),
        descriptor: this.clamp01(descriptor),
        profile: this.clamp01(profileScore),
        distance: Math.max(0, dist2)
      }
    };
  }

  compareFftData(fft1, fft2) {
    return this.compareToReference(fft1, { fft: fft2 }).similarity;
  }

  clamp01(value) {
    if (!Number.isFinite(value)) return 0;
    if (value < 0) return 0;
    if (value > 1) return 1;
    return value;
  }
}

module.exports = AudioAnalyzer;
