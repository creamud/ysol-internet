const patterns = {
  click: [[520, 310, 0.055, 'sine']],
  step: [[145, 62, 0.09, 'triangle'], [330, 113, 0.055, 'sine']],
  door: [[150, 70, 0.16, 'triangle']],
  boot: [[330, 395, 0.12, 'sine'], [660, 720, 0.18, 'sine']],
  power: [[350, 150, 0.14, 'sine']],
  cash: [[659, 698, 0.13, 'sine'], [880, 940, 0.14, 'sine'], [1318, 1396, 0.28, 'triangle']],
  delivery: [[460, 540, 0.11, 'sine'], [700, 870, 0.17, 'triangle']],
  place: [[160, 55, 0.16, 'triangle']],
  swing: [[150, 90, 0.13, 'triangle']],
  hit: [[145, 32, 0.20, 'square']],
};

export function createSound() {
  let context;
  let volume = 0.65;
  let musicVolume = 0.32;
  let musicGain;
  let musicBuffer;
  let previousMusicLevel = 0;
  const foley = {
    key: [0.074, [[0,0.035,0.38,2150],[0.029,0.04,0.17,1450]]],
    doorOpen: [0.55, [[0,0.055,0.55,520], [0.09,0.43,0.29,940], [0.47,0.07,0.24,290]]],
    doorClose: [0.55, [[0.01,0.31,0.16,650], [0.29,0.21,0.81,145], [0.33,0.13,0.42,1760]]],
    apartmentDoor: [0.86, [[0.01,0.09,0.48,1850], [0.12,0.42,0.22,590], [0.53,0.31,0.91,104], [0.58,0.12,0.41,1410]]],
    pcShutdown: [1.16, [[0,1.04,0.25,830], [0.04,0.71,0.15,345], [0.79,0.08,0.42,2210]]],
    brew: [0.68, [[0.01,0.44,0.26,630], [0.27,0.36,0.25,1230]]],
    sip: [0.39, [[0.02,0.29,0.24,905], [0.20,0.16,0.22,640]]],
  };
  const samples = new Map();
  foley.fridgeOpen = foley.doorOpen;
  async function loadRecording(metaName) {
    const url = document.querySelector(`meta[name="${metaName}"]`)?.content;
    if (!url) return null;
    const response = await fetch(url);
    if (!response.ok) return null;
    return context.decodeAudioData(await response.arrayBuffer());
  }
  function playFoley(name, delay) {
    let buffer = samples.get(name);
    if (!buffer) {
      if (!context.createBuffer) return;
      const [duration, layers] = foley[name];
      const rate = context.sampleRate;
      buffer = context.createBuffer(1, Math.ceil(rate * duration), rate);
      const output = buffer.getChannelData(0);
      let seed = 1143;
      for (const [offset, length, level, tone] of layers) {
        let filtered = 0;
        const start = Math.floor(offset * rate);
        const count = Math.floor(length * rate);
        for (let i=0;i<count && start+i<output.length;i++) {
          seed = (Math.imul(seed,1664525)+1013904223) >>> 0;
          filtered += Math.min(.85, tone * 5 / rate) * ((seed / 2147483648 - 1) - filtered);
          const t = i / rate;
          const phase = t / length;
          const sustain = tone > 300 && length > .27;
          const envelope = Math.min(1,t / .008) * (sustain ? (1-phase) ** 1.75 : Math.exp(-phase*6.1));
          const resonance = Math.sin(Math.PI*2*t*tone*(1-phase*(name==='pcShutdown'?.43:.12)));
          const color = sustain ? filtered*.77 + resonance*.07 : filtered*.60 + resonance*.32;
          output[start+i] += color * level * envelope;
        }
      }
      samples.set(name, buffer);
    }
    const player = context.createBufferSource();
    const gain = context.createGain();
    gain.gain.value = volume * 0.74;
    player.buffer = buffer;
    player.connect(gain);
    gain.connect(context.destination);
    player.start(context.currentTime + delay);
  }
  return {
    setVolume(value) { volume = value; },
    setMusic(value) { musicVolume = value; },
    updateMusic(playing) {
      if (context?.state !== 'running') return;
      if (playing && musicBuffer) {
        const source = context.createBufferSource();
        source.buffer = musicBuffer;
        source.loop = true;
        source.connect(musicGain);
        source.start();
        musicBuffer = null;
      }
      const now = context.currentTime;
      const level = playing ? musicVolume : 0;
      if (level !== previousMusicLevel) {
        musicGain.gain.setTargetAtTime(level, now, 0.15);
        previousMusicLevel = level;
      }
    },
    unlock() {
      const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Audio) return;
      try {
        if (!context) {
          context = new Audio();
          musicGain = context.createGain();
          musicGain.gain.value = 0;
          musicGain.connect(context.destination);
          for (const [name, meta] of [['doorOpen', 'door-open-audio'], ['shopOpen', 'shop-open-audio']]) {
            loadRecording(meta).then(buffer => {
              if (buffer) samples.set(name, buffer);
            }).catch(() => {});
          }
          loadRecording('background-music').then(buffer => {
            musicBuffer = buffer;
          }).catch(() => {});
        }
        if (context.state !== 'running') context.resume().catch(() => {});
      } catch {
        // Audio is optional on browsers without a usable audio device.
      }
    },
    play(name, delay = 0) {
      if (context?.state !== 'running' || volume === 0) return;
      if (samples.has(name) || foley[name]) { playFoley(name, delay); return; }
      const now = context.currentTime;
      patterns[name === 'shopOpen' ? 'click' : name]?.forEach(([start, end, duration, type], index) => {
        const time = now + delay + index * 0.095;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(start, time);
        oscillator.frequency.exponentialRampToValueAtTime(end, time + duration);
        gain.gain.setValueAtTime(0.001, time);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.002, volume * (name === 'step' ? 0.21 : 0.16)), time + 0.009);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(time);
        oscillator.stop(time + duration);
      });
    },
  };
}
