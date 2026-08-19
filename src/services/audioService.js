// Audio Speech & Sound Feedback Service for Kiosk System

class AudioService {
  constructor() {
    this.synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
    this.speechEnabled = true;
    this.cachedVoices = [];

    if (this.synth) {
      this.loadVoices();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  loadVoices() {
    if (!this.synth) return;
    try {
      this.cachedVoices = this.synth.getVoices() || [];
    } catch (e) {
      console.warn('Failed to load voices:', e);
    }
  }

  speak(text) {
    if (!text || !this.speechEnabled) return;

    if (!this.synth) {
      console.warn('Speech synthesis not available in this environment');
      return;
    }

    try {
      // Resume synthesis if paused (common Chrome/Android issue)
      if (this.synth.paused) {
        this.synth.resume();
      }

      // Cancel previous utterances to avoid queue backlog
      this.synth.cancel();

      // Create new utterance with small delay to let cancel settle
      setTimeout(() => {
        try {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 0.95;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;

          // Select preferred voice
          const voices = this.cachedVoices.length > 0 ? this.cachedVoices : (this.synth.getVoices() || []);
          const enVoice = voices.find(v => v.lang && (v.lang.startsWith('en-US') || v.lang.startsWith('en-GB') || v.lang.startsWith('en')));
          if (enVoice) {
            utterance.voice = enVoice;
          }

          this.synth.speak(utterance);
        } catch (innerErr) {
          console.warn('SpeechSynthesisUtterance inner error:', innerErr);
        }
      }, 50);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  }

  notify(text, type = 'alert') {
    if (!text) return;
    const cleanText = String(text)
      .replace(/<[^>]*>?/gm, '')
      .replace(/[🚨✅🔄📋]/g, '')
      .trim();

    const lower = cleanText.toLowerCase();
    const isError = type === 'error' || lower.includes('error') || lower.includes('denied') || lower.includes('required') || lower.includes('already checkin') || lower.includes('failed') || lower.includes('invalid');
    const isSos = type === 'sos' || lower.includes('sos') || lower.includes('emergency');

    if (isError) {
      this.playBeep('error');
    } else if (isSos) {
      this.playBeep('sos');
    } else {
      this.playBeep('success');
    }

    this.speak(cleanText);
  }

  playBeep(type = 'success') {
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtxClass) return;

      const audioCtx = new AudioCtxClass();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      } else if (type === 'sos') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(880, audioCtx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
      } else {
        osc.type = 'square';
        osc.frequency.setValueAtTime(220, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      }
    } catch (e) {
      console.warn('AudioContext error:', e);
    }
  }
}

export const audioService = new AudioService();

// Global Interceptor: Trigger automatic audio voiceover for system window.alert calls
if (typeof window !== 'undefined') {
  const nativeAlert = window.alert;
  window.alert = function (message) {
    try {
      if (message) {
        audioService.notify(message);
      }
    } catch (e) {
      console.warn('Audio alert voiceover error:', e);
    }
    return nativeAlert.apply(window, arguments);
  };
}
