/**
 * Adaptive Audio Processing Pipeline for SONU
 * Implements intelligent audio processing with dynamic parameter adjustment
 */

class AudioProcessor {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.mediaStream = null;
    this.isInitialized = false;
    
    // Audio quality metrics
    this.metrics = {
      noiseLevel: 0,
      signalStrength: 0,
      clippingCount: 0,
      silenceRatio: 0,
      frequency: { low: 0, mid: 0, high: 0 }
    };

    // Adaptive parameters
    this.params = {
      noiseGate: -50, // dB
      compressorThreshold: -24,
      compressorRatio: 4,
      highPassFrequency: 80,
      lowPassFrequency: 8000,
      gain: 1.0
    };

    // Processing nodes
    this.nodes = {};
  }

  async initialize() {
    if (this.isInitialized) return true;

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000 // Optimal for Whisper
      });

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;

      this.isInitialized = true;
      console.log('Audio processor initialized');
      return true;
    } catch (e) {
      console.error('Failed to initialize audio processor:', e);
      return false;
    }
  }

  async connectStream(mediaStream) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    this.mediaStream = mediaStream;

    // Create source node
    const source = this.audioContext.createMediaStreamSource(mediaStream);

    // Create processing chain
    this.setupProcessingChain(source);

    // Start quality analysis
    this.startQualityAnalysis();

    return true;
  }

  setupProcessingChain(source) {
    // High-pass filter to remove low frequency rumble
    const highPass = this.audioContext.createBiquadFilter();
    highPass.type = 'highpass';
    highPass.frequency.value = this.params.highPassFrequency;
    highPass.Q.value = 0.7;
    this.nodes.highPass = highPass;

    // Low-pass filter to remove high frequency noise
    const lowPass = this.audioContext.createBiquadFilter();
    lowPass.type = 'lowpass';
    lowPass.frequency.value = this.params.lowPassFrequency;
    lowPass.Q.value = 0.7;
    this.nodes.lowPass = lowPass;

    // Dynamics compressor for level consistency
    const compressor = this.audioContext.createDynamicsCompressor();
    compressor.threshold.value = this.params.compressorThreshold;
    compressor.knee.value = 30;
    compressor.ratio.value = this.params.compressorRatio;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;
    this.nodes.compressor = compressor;

    // Gain node for adaptive level adjustment
    const gain = this.audioContext.createGain();
    gain.gain.value = this.params.gain;
    this.nodes.gain = gain;

    // Connect the chain
    source.connect(highPass);
    highPass.connect(lowPass);
    lowPass.connect(compressor);
    compressor.connect(gain);
    gain.connect(this.analyser);

    // Also connect to destination for monitoring (optional)
    // gain.connect(this.audioContext.destination);
  }

  startQualityAnalysis() {
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    const freqArray = new Uint8Array(bufferLength);

    const analyze = () => {
      if (!this.isInitialized) return;

      // Time domain analysis
      this.analyser.getFloatTimeDomainData(dataArray);
      
      // Calculate signal metrics
      let sum = 0;
      let peak = 0;
      let silentSamples = 0;
      const silenceThreshold = 0.01;

      for (let i = 0; i < bufferLength; i++) {
        const value = Math.abs(dataArray[i]);
        sum += value * value;
        peak = Math.max(peak, value);
        if (value < silenceThreshold) silentSamples++;
      }

      const rms = Math.sqrt(sum / bufferLength);
      this.metrics.signalStrength = rms;
      this.metrics.silenceRatio = silentSamples / bufferLength;

      // Check for clipping
      if (peak > 0.99) {
        this.metrics.clippingCount++;
      }

      // Frequency domain analysis
      this.analyser.getByteFrequencyData(freqArray);
      
      // Analyze frequency bands
      const binWidth = this.audioContext.sampleRate / this.analyser.fftSize;
      let lowSum = 0, midSum = 0, highSum = 0;
      let lowCount = 0, midCount = 0, highCount = 0;

      for (let i = 0; i < bufferLength; i++) {
        const freq = i * binWidth;
        const value = freqArray[i] / 255;

        if (freq < 300) {
          lowSum += value;
          lowCount++;
        } else if (freq < 3000) {
          midSum += value;
          midCount++;
        } else {
          highSum += value;
          highCount++;
        }
      }

      this.metrics.frequency = {
        low: lowCount > 0 ? lowSum / lowCount : 0,
        mid: midCount > 0 ? midSum / midCount : 0,
        high: highCount > 0 ? highSum / highCount : 0
      };

      // Estimate noise level (energy in non-speech frequencies)
      this.metrics.noiseLevel = (this.metrics.frequency.low + this.metrics.frequency.high) / 2;

      // Adapt parameters based on analysis
      this.adaptParameters();

      // Continue analysis
      if (this.isInitialized) {
        requestAnimationFrame(analyze);
      }
    };

    requestAnimationFrame(analyze);
  }

  adaptParameters() {
    // Adapt gain based on signal strength
    if (this.metrics.signalStrength < 0.05) {
      // Signal too weak, increase gain
      this.params.gain = Math.min(2.0, this.params.gain + 0.05);
    } else if (this.metrics.signalStrength > 0.5 || this.metrics.clippingCount > 5) {
      // Signal too strong or clipping, reduce gain
      this.params.gain = Math.max(0.5, this.params.gain - 0.1);
      this.metrics.clippingCount = Math.max(0, this.metrics.clippingCount - 1);
    }

    // Adapt noise gate based on noise level
    if (this.metrics.noiseLevel > 0.3) {
      // High noise, tighten noise gate
      this.params.noiseGate = Math.min(-30, this.params.noiseGate + 2);
    } else if (this.metrics.noiseLevel < 0.1) {
      // Low noise, relax noise gate
      this.params.noiseGate = Math.max(-60, this.params.noiseGate - 1);
    }

    // Adapt high-pass filter based on low frequency noise
    if (this.metrics.frequency.low > 0.4) {
      // Too much low frequency noise
      this.params.highPassFrequency = Math.min(150, this.params.highPassFrequency + 10);
    } else if (this.metrics.frequency.low < 0.1) {
      this.params.highPassFrequency = Math.max(60, this.params.highPassFrequency - 5);
    }

    // Apply adapted parameters
    this.applyParameters();
  }

  applyParameters() {
    if (this.nodes.gain) {
      this.nodes.gain.gain.setValueAtTime(
        this.params.gain,
        this.audioContext.currentTime
      );
    }

    if (this.nodes.highPass) {
      this.nodes.highPass.frequency.setValueAtTime(
        this.params.highPassFrequency,
        this.audioContext.currentTime
      );
    }

    if (this.nodes.lowPass) {
      this.nodes.lowPass.frequency.setValueAtTime(
        this.params.lowPassFrequency,
        this.audioContext.currentTime
      );
    }

    if (this.nodes.compressor) {
      this.nodes.compressor.threshold.setValueAtTime(
        this.params.compressorThreshold,
        this.audioContext.currentTime
      );
    }
  }

  // Get audio quality score (0-100)
  getQualityScore() {
    let score = 100;

    // Penalize low signal
    if (this.metrics.signalStrength < 0.1) {
      score -= 30;
    } else if (this.metrics.signalStrength < 0.2) {
      score -= 15;
    }

    // Penalize high noise
    if (this.metrics.noiseLevel > 0.4) {
      score -= 25;
    } else if (this.metrics.noiseLevel > 0.2) {
      score -= 10;
    }

    // Penalize clipping
    score -= Math.min(30, this.metrics.clippingCount * 5);

    // Penalize too much silence
    if (this.metrics.silenceRatio > 0.9) {
      score -= 20;
    }

    return Math.max(0, Math.min(100, score));
  }

  // Get quality assessment
  getQualityAssessment() {
    const score = this.getQualityScore();
    const issues = [];

    if (this.metrics.signalStrength < 0.1) {
      issues.push('Signal too weak - speak louder or move closer to microphone');
    }

    if (this.metrics.noiseLevel > 0.3) {
      issues.push('High background noise detected - try a quieter environment');
    }

    if (this.metrics.clippingCount > 5) {
      issues.push('Audio clipping detected - reduce microphone gain');
    }

    if (this.metrics.silenceRatio > 0.9) {
      issues.push('Mostly silence detected - ensure microphone is working');
    }

    return {
      score,
      quality: score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'poor',
      issues,
      metrics: { ...this.metrics },
      params: { ...this.params }
    };
  }

  // Get processed audio data
  getProcessedData() {
    if (!this.analyser) return null;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    this.analyser.getFloatTimeDomainData(dataArray);

    return dataArray;
  }

  // Get frequency data for visualization
  getFrequencyData() {
    if (!this.analyser) return null;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);

    return dataArray;
  }

  // Manual parameter adjustment
  setParameter(name, value) {
    if (name in this.params) {
      this.params[name] = value;
      this.applyParameters();
    }
  }

  resetParameters() {
    this.params = {
      noiseGate: -50,
      compressorThreshold: -24,
      compressorRatio: 4,
      highPassFrequency: 80,
      lowPassFrequency: 8000,
      gain: 1.0
    };
    this.applyParameters();
  }

  // Voice Activity Detection (VAD)
  isVoiceActive() {
    // Simple VAD based on signal strength and frequency characteristics
    const hasSignal = this.metrics.signalStrength > 0.1;
    const hasSpeechFrequencies = this.metrics.frequency.mid > 0.2;
    const notJustNoise = this.metrics.frequency.mid > this.metrics.noiseLevel * 1.5;

    return hasSignal && hasSpeechFrequencies && notJustNoise;
  }

  disconnect() {
    // Disconnect all nodes
    Object.values(this.nodes).forEach(node => {
      try {
        node.disconnect();
      } catch (e) {}
    });

    this.nodes = {};

    // Stop media stream
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
  }

  destroy() {
    this.disconnect();

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }

    this.audioContext = null;
    this.analyser = null;
    this.isInitialized = false;

    console.log('Audio processor destroyed');
  }
}

// Singleton instance
let audioProcessorInstance = null;

function getAudioProcessor() {
  if (!audioProcessorInstance) {
    audioProcessorInstance = new AudioProcessor();
  }
  return audioProcessorInstance;
}

// Make available globally
if (typeof window !== 'undefined') {
  window.AudioProcessor = AudioProcessor;
  window.getAudioProcessor = getAudioProcessor;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AudioProcessor, getAudioProcessor };
}
