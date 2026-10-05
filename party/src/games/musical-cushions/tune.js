// Musical Cushions - the party tune. The engine's music player can only play
// or stop a song (no pause, no tempo/pitch control), so the game plays its
// own little oom-pah party tune on the audio clock: marimba lead with a bell
// sparkle, piano chord stabs on the off-beats, a bouncy synth bass and
// kick/clap/shaker. Recorded inst/<id> samples are used when they exist (the
// same ones Melody Maker uses), else synth stand-ins.
//
// What the game needs from it:
//   start(bpm)   needle down: the tune picks up where it left off
//   tell(dur)    the "freeze" warning: tempo and pitch sag like a record slowing
//   recover()    a fake-out: back up to speed
//   stop()       record scratch, silence
//   beat         visual beat counter (driven by game time, so it also works muted)
import { audioCtx, sfxInput, soundBuffer, hasSound, sfx } from '../../engine/audio.js';
import { damp } from '../../engine/util.js';

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// 8 bars of 8 eighth-notes, A section (bars 1-4) and B section (bars 5-8).
const LEAD = [
  64, 67, 72, 67, 64, 67, 72, null,
  65, 69, 72, 69, 65, 69, 72, null,
  62, 67, 71, 67, 74, 72, 71, 69,
  67, 64, 60, 64, 67, null, 72, null,
  69, 72, 76, 72, 69, 72, 76, null,
  65, 69, 72, 69, 65, 69, 72, 74,
  66, 69, 74, 69, 67, 71, 74, 77,
  76, 74, 72, 71, 69, 67, 65, 62,
];
const CHORDS = [[60, 64, 67], [60, 65, 69], [59, 62, 67], [60, 64, 67], [60, 64, 69], [60, 65, 69], [60, 62, 66], [59, 62, 65]];
const ROOT = [36, 41, 43, 36, 45, 41, 38, 43];
const FIFTH = [43, 36, 38, 43, 40, 36, 45, 38];
const STEPS = LEAD.length;

export class Tune {
  constructor() {
    this.ac = null; this.bus = null; this.out = null;
    this.step = 0; this.nextAt = 0;
    this.playing = false;
    this.bpm = 132;
    this.rate = 1; this.rateTo = 1;      // tempo factor
    this.pitch = 1; this.pitchTo = 1;    // pitch factor of new notes
    this.voices = [];
    this.beat = 0;                       // visual beats (game time)
    this.vol = 0.62;
    this.dead = false;
  }

  ensure() {
    if (this.dead) return false;
    if (!this.ac) {
      this.ac = audioCtx();
      if (!this.ac) return false;
      this.bus = sfxInput(0.9);
      if (!this.bus) { this.ac = null; return false; }
      this.out = this.ac.createGain(); this.out.gain.value = 0.0001; this.out.connect(this.bus);
    }
    return this.ac.state === 'running';
  }

  get stepDur() { return 60 / this.bpm / 2 / Math.max(0.2, this.rate); }

  start(bpm = this.bpm) {
    this.bpm = bpm;
    this.playing = true;
    this.rate = this.rateTo = 1; this.pitch = this.pitchTo = 1;
    this.pendingStart = true;
    this.kick();
  }

  /** Needle down once the audio is running (it may still be locked when start() is called). */
  kick() {
    if (!this.pendingStart || !this.ensure()) return;
    this.pendingStart = false;
    const now = this.ac.currentTime, g = this.out.gain;
    g.cancelScheduledValues(now); g.setValueAtTime(Math.max(0.0001, g.value), now); g.linearRampToValueAtTime(this.vol, now + 0.06);
    this.nextAt = now + 0.05;
    this.crackle(now);
  }

  /** The warning before a stop (or a fake-out): slow down and sag in pitch over `dur`. */
  tell(dur = 0.6) {
    this.rateTo = 0.5; this.pitchTo = 0.74;
    this.bendTo(0.74, dur * 0.45);
  }

  /** Fake-out: wind back up to speed. */
  recover() {
    this.rateTo = 1; this.pitchTo = 1;
    this.bendTo(1, 0.12);
  }

  /** Needle off: record scratch, then silence. */
  stop() {
    this.playing = false;
    if (this.pendingStart) { this.pendingStart = false; return; }
    if (!this.ensure()) return;
    const now = this.ac.currentTime, g = this.out.gain;
    this.bendTo(0.35, 0.05);
    g.cancelScheduledValues(now); g.setValueAtTime(Math.max(0.0001, g.value), now); g.linearRampToValueAtTime(0.0001, now + 0.16);
    if (hasSound('cush-scratch')) sfx('cush-scratch');
    else this.scratch(now);
  }

  /** Called every frame by the game (also while the audio is muted or locked). */
  update(dt) {
    if (this.playing) {
      this.rate = damp(this.rate, this.rateTo, this.rateTo < this.rate ? 4 : 9, dt);
      this.pitch = damp(this.pitch, this.pitchTo, this.pitchTo < this.pitch ? 4 : 9, dt);
      this.beat += dt * (this.bpm / 60) * this.rate;
    }
    if (!this.playing || !this.ensure()) return;
    this.kick();
    const now = this.ac.currentTime;
    if (this.nextAt < now - 0.08) this.nextAt = now + 0.02;   // after a pause: don't machine-gun the missed notes
    while (this.nextAt < now + 0.12) {
      this.playStep(this.step, this.nextAt);
      this.step = (this.step + 1) % STEPS;
      this.nextAt += this.stepDur;
    }
    if (this.voices.length > 40) this.voices = this.voices.filter((v) => v.end > now);
  }

  destroy() {
    this.dead = true; this.playing = false;
    if (!this.ac || !this.out) return;
    const now = this.ac.currentTime, out = this.out, bus = this.bus;
    try {
      out.gain.cancelScheduledValues(now); out.gain.setValueAtTime(Math.max(0.0001, out.gain.value), now); out.gain.linearRampToValueAtTime(0.0001, now + 0.2);
    } catch (e) { /* closed */ }
    setTimeout(() => { try { out.disconnect(); bus.disconnect(); } catch (e) { /* gone */ } }, 400);
  }

  // --- voices -----------------------------------------------------------------
  bendTo(pitch, tc) {
    if (!this.ac) return;
    const now = this.ac.currentTime;
    this.voices = this.voices.filter((v) => v.end > now);
    for (const v of this.voices) {
      try {
        if (v.kind === 'rate') v.param.setTargetAtTime(v.base * pitch, now, tc);
        else v.param.setTargetAtTime(1200 * Math.log2(pitch), now, tc);
      } catch (e) { /* ended */ }
    }
  }

  sample(key, midiFromBase, t, vol) {
    const buf = soundBuffer(key);
    if (!buf) return false;
    const ac = this.ac, rate = Math.pow(2, midiFromBase / 12);
    const s = ac.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate * this.pitch;
    const gn = ac.createGain(); gn.gain.value = vol;
    s.connect(gn); gn.connect(this.out);
    const len = Math.min(buf.duration / rate, 2.2);
    s.start(t); s.stop(t + len);
    this.voices.push({ kind: 'rate', param: s.playbackRate, base: rate, end: t + len });
    return true;
  }

  osc(type, f, t, vol, a, d, lp = 0) {
    const ac = this.ac;
    const o = ac.createOscillator(), gn = ac.createGain();
    o.type = type; o.frequency.value = f; o.detune.value = 1200 * Math.log2(this.pitch);
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + a);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    let node = o;
    if (lp) { const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; o.connect(fl); node = fl; }
    node.connect(gn); gn.connect(this.out);
    o.start(t); o.stop(t + a + d + 0.05);
    this.voices.push({ kind: 'detune', param: o.detune, end: t + a + d + 0.05 });
  }

  noise(t, vol, d, type, f, q = 1) {
    const ac = this.ac, len = Math.ceil(ac.sampleRate * 0.4);
    if (!this.noiseBuf || this.noiseBuf.sampleRate !== ac.sampleRate) {
      this.noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
      const dd = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) dd[i] = Math.random() * 2 - 1;
    }
    const s = ac.createBufferSource(); s.buffer = this.noiseBuf;
    const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const gn = ac.createGain();
    gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(fl); fl.connect(gn); gn.connect(this.out);
    s.start(t); s.stop(t + d + 0.02);
  }

  lead(m, t, strong) {
    if (!this.sample('inst/marimba', m - 12 - 60, t, 0.72)) {
      const f = mtof(m) * this.pitch;
      this.osc('sine', f, t, 0.26, 0.004, 0.32);
      this.osc('triangle', f * 2, t, 0.05, 0.002, 0.1);
    }
    if (strong && !this.sample('inst/bells', m - 72, t, 0.2)) this.osc('sine', mtof(m + 12) * this.pitch, t, 0.05, 0.003, 0.5);
  }

  chord(notes, t) {
    for (const m of notes) {
      if (!this.sample('inst/piano', m - 60, t, 0.24)) this.osc('triangle', mtof(m) * this.pitch, t, 0.09, 0.004, 0.16, 2600);
    }
  }

  drum(kind, t) {
    if (this.sample('inst/' + kind, 0, t, { kick: 0.7, clap: 0.42, shaker: 0.22 }[kind])) return;
    if (kind === 'kick') this.osc('sine', 120, t, 0.5, 0.002, 0.16);
    else if (kind === 'clap') this.noise(t, 0.35, 0.1, 'bandpass', 1400, 1.2);
    else this.noise(t, 0.08, 0.04, 'highpass', 6500);
  }

  playStep(step, t) {
    const bar = Math.floor(step / 8), i = step % 8, strong = i === 0 || i === 4;
    const m = LEAD[step];
    if (m != null) this.lead(m, t, strong);
    // oom-pah: bass on the beats (root, fifth), chord stabs on the "and"s
    if (i % 2 === 0) this.osc('triangle', mtof(i % 4 === 0 ? ROOT[bar] : FIFTH[bar]) * this.pitch, t, 0.3, 0.005, this.stepDur * 1.4);
    else this.chord(CHORDS[bar], t);
    if (i === 0 || i === 4) this.drum('kick', t);
    if (i === 2 || i === 6) this.drum('clap', t);
    this.drum('shaker', t);
  }

  // --- needle sounds --------------------------------------------------------
  crackle(t) {
    this.noise(t, 0.12, 0.05, 'highpass', 3000);
    this.noise(t + 0.03, 0.06, 0.03, 'highpass', 4500);
  }

  /** Synth record scratch (stand-in until `cush-scratch` exists), straight to the bus. */
  scratch(t) {
    const ac = this.ac, bus = this.bus;
    const s = ac.createBufferSource(); s.buffer = this.noiseBuf || ac.createBuffer(1, 4410, 44100);
    if (!this.noiseBuf) { const d = s.buffer.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    s.loop = true;
    const fl = ac.createBiquadFilter(); fl.type = 'bandpass'; fl.Q.value = 3;
    fl.frequency.setValueAtTime(2600, t); fl.frequency.exponentialRampToValueAtTime(1100, t + 0.07);
    fl.frequency.setValueAtTime(2000, t + 0.08); fl.frequency.exponentialRampToValueAtTime(260, t + 0.3);
    const gn = ac.createGain();
    gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(0.5, t + 0.01);
    gn.gain.setValueAtTime(0.5, t + 0.06); gn.gain.exponentialRampToValueAtTime(0.12, t + 0.08);
    gn.gain.exponentialRampToValueAtTime(0.45, t + 0.1); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
    s.connect(fl); fl.connect(gn); gn.connect(bus);
    s.start(t); s.stop(t + 0.36);
    const o = ac.createOscillator(), og = ac.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(320, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.3);
    og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(0.1, t + 0.01); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
    o.connect(lp); lp.connect(og); og.connect(bus);
    o.start(t); o.stop(t + 0.32);
  }
}

