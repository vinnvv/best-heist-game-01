// Procedural WebAudio sounds only: short oscillator blips and filtered noise, no audio files
// and no network. The context is created on the first user gesture; M toggles mute.

export function createAudio() {
  let ctx = null;
  let muted = false;
  let alarmTimer = null;

  function ensure() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        ctx = null;
      }
    }
    if (ctx && ctx.state === 'suspended') void ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, gain, when = 0) {
    const ac = ensure();
    if (!ac || muted) return;
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    amp.gain.setValueAtTime(gain, ac.currentTime + when);
    amp.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + when + dur);
    osc.connect(amp);
    amp.connect(ac.destination);
    osc.start(ac.currentTime + when);
    osc.stop(ac.currentTime + when + dur);
  }

  function noise(dur, gain, freq) {
    const ac = ensure();
    if (!ac || muted) return;
    const len = Math.floor(ac.sampleRate * dur);
    const buffer = ac.createBuffer(1, len, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource();
    src.buffer = buffer;
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    const amp = ac.createGain();
    amp.gain.value = gain;
    src.connect(filter);
    filter.connect(amp);
    amp.connect(ac.destination);
    src.start();
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      if (muted) this.stopAlarm();
      return muted;
    },
    get muted() {
      return muted;
    },
    click() {
      tone(880, 0.06, 'square', 0.05);
    },
    pickup() {
      tone(523, 0.12, 'sine', 0.12);
      tone(659, 0.12, 'sine', 0.12, 0.09);
      tone(784, 0.2, 'sine', 0.12, 0.18);
    },
    jammer() {
      noise(0.25, 0.12, 1800);
      tone(220, 0.2, 'sawtooth', 0.05);
    },
    cameraOff() {
      tone(1200, 0.08, 'square', 0.06);
      tone(900, 0.12, 'square', 0.06, 0.07);
    },
    spotted() {
      tone(440, 0.12, 'square', 0.08);
      tone(440, 0.12, 'square', 0.08, 0.16);
    },
    caught() {
      tone(180, 0.3, 'sawtooth', 0.12);
      noise(0.3, 0.1, 900);
    },
    win() {
      tone(523, 0.15, 'sine', 0.12);
      tone(659, 0.15, 'sine', 0.12, 0.12);
      tone(784, 0.15, 'sine', 0.12, 0.24);
      tone(1046, 0.35, 'sine', 0.12, 0.36);
    },
    lockdown() {
      tone(110, 0.8, 'sawtooth', 0.12);
      tone(116, 0.8, 'sawtooth', 0.1, 0.05);
    },
    startAlarm() {
      if (alarmTimer || muted) return;
      alarmTimer = setInterval(() => {
        tone(980, 0.1, 'square', 0.05);
      }, 500);
    },
    stopAlarm() {
      if (alarmTimer) {
        clearInterval(alarmTimer);
        alarmTimer = null;
      }
    },
  };
}
