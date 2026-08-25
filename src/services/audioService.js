// Human Voiceover Audio & Sound Feedback Service for Kiosk & Mobile APK System
import { TextToSpeech } from '@capacitor-community/text-to-speech';

class AudioService {
  constructor() {
    this.synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
    this.speechEnabled = true;
    this.cachedVoices = [];
    this.isNative = false;
    this.unlocked = false;

    // Detect Capacitor Native environment
    if (typeof window !== 'undefined' && window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function') {
      this.isNative = window.Capacitor.isNativePlatform();
    }

    if (this.synth) {
      this.loadVoices();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
      }
    }

    // Auto-unlock audio and speech on first user gesture
    if (typeof window !== 'undefined') {
      const unlockHandler = () => {
        this.unlockAudio();
        window.removeEventListener('click', unlockHandler);
        window.removeEventListener('touchstart', unlockHandler);
      };
      window.addEventListener('click', unlockHandler, { passive: true });
      window.addEventListener('touchstart', unlockHandler, { passive: true });
    }
  }

  unlockAudio() {
    if (this.unlocked) return;
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        const audioCtx = new AudioCtxClass();
        if (audioCtx.state === 'suspended') {
          audioCtx.resume();
        }
      }
      if (this.synth && this.synth.paused) {
        this.synth.resume();
      }
      this.unlocked = true;
    } catch (e) {
      console.warn('Audio unlock error:', e);
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

  // Get best natural human-sounding voice available
  getBestVoice() {
    if (!this.synth) return null;
    const voices = this.cachedVoices.length > 0 ? this.cachedVoices : (this.synth.getVoices() || []);
    if (!voices || voices.length === 0) return null;

    // 1. Check for modern Neural / Natural voices (Edge, Windows, Google, Safari)
    const naturalVoice = voices.find(v =>
      (v.name && (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Online') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Jenny') || v.name.includes('Aria'))) &&
      v.lang && (v.lang.startsWith('en-US') || v.lang.startsWith('en-GB') || v.lang.startsWith('en-IN') || v.lang.startsWith('en'))
    );
    if (naturalVoice) return naturalVoice;

    // 2. Check for any standard English voice
    const enVoice = voices.find(v => v.lang && (v.lang.startsWith('en-US') || v.lang.startsWith('en-GB') || v.lang.startsWith('en')));
    if (enVoice) return enVoice;

    return voices[0] || null;
  }

  async speak(text, options = {}) {
    if (!text || !this.speechEnabled) return;

    const rate = options.rate || 0.95;
    const pitch = options.pitch || 1.0;
    const volume = options.volume || 1.0;

    // 1. Native Mobile APK TTS (Android / iOS via Capacitor Native TextToSpeech Engine)
    if (this.isNative) {
      try {
        await TextToSpeech.stop();
        await TextToSpeech.speak({
          text: text,
          lang: 'en-US',
          rate: rate,
          pitch: pitch,
          volume: volume,
          category: 'ambient',
        });
        return;
      } catch (nativeErr) {
        console.warn('Native TextToSpeech failed, falling back to web synthesis:', nativeErr);
      }
    }

    // 2. Browser Web Speech Synthesis Fallback
    if (!this.synth) {
      console.warn('Speech synthesis not available in this environment');
      return;
    }

    try {
      if (this.synth.paused) {
        this.synth.resume();
      }

      this.synth.cancel();

      setTimeout(() => {
        try {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = rate;
          utterance.pitch = pitch;
          utterance.volume = volume;

          const voice = this.getBestVoice();
          if (voice) {
            utterance.voice = voice;
          }

          this.synth.speak(utterance);
        } catch (innerErr) {
          console.warn('SpeechSynthesisUtterance inner error:', innerErr);
        }
      }, 60);
    } catch (e) {
      console.warn('Web speech synthesis error:', e);
    }
  }

  // Dedicated Check-In Human Voiceover
  playCheckInVoiceover(firstName, shiftName) {
    const name = firstName || 'there';
    const shift = shiftName ? `for ${shiftName}` : '';
    const message = `Thank you, ${name}. You have successfully checked in ${shift}. Have a productive day!`;
    this.playBeep('success');
    this.speak(message, { rate: 0.95 });
  }

  // Dedicated Check-Out Human Voiceover
  playCheckOutVoiceover(firstName, shiftName) {
    const name = firstName || 'there';
    const shift = shiftName ? `from ${shiftName}` : '';
    const message = `Thank you, ${name}. You have successfully checked out ${shift}. Have a wonderful evening!`;
    this.playBeep('success');
    this.speak(message, { rate: 0.95 });
  }

  // Dedicated Attendance Regularization Human Voiceover
  playRegularizationVoiceover(action = 'SUBMITTED', firstName = '') {
    let message = 'Attendance regularization request submitted successfully. It has been routed to your branch manager for approval.';
    if (action === 'APPROVED') {
      message = 'Attendance regularization has been approved successfully.';
    } else if (action === 'REJECTED') {
      message = 'Attendance regularization request was rejected.';
    }
    this.playBeep(action === 'REJECTED' ? 'error' : 'success');
    this.speak(message, { rate: 0.95 });
  }

  // Dedicated Petty Cash Human Voiceover
  playPettyCashVoiceover(amount, action = 'SUBMITTED') {
    const amountStr = amount ? `for rupees ${Number(amount).toLocaleString('en-IN')}` : '';
    let message = `Petty cash expense claim ${amountStr} has been submitted successfully and is awaiting manager approval.`;

    if (action === 'APPROVED_L1') {
      message = 'Petty cash claim approved at Level 1, and routed to Superior Manager for final review.';
    } else if (action === 'APPROVED') {
      message = 'Petty cash expense claim has been successfully approved and completed.';
    } else if (action === 'REJECTED') {
      message = 'Petty cash expense claim was rejected.';
    } else if (action === 'SEND_BACK') {
      message = 'Petty cash expense claim was sent back for revision.';
    }

    this.playBeep(action === 'REJECTED' ? 'error' : 'success');
    this.speak(message, { rate: 0.95 });
  }

  notify(text, type = 'alert') {
    if (!text) return;
    const cleanText = String(text)
      .replace(/<[^>]*>?/gm, '')
      .replace(/[🚨✅🔄📋💵⏳]/g, '')
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
      console.warn('Audio tone error:', e);
    }
  }
}

export const audioService = new AudioService();
