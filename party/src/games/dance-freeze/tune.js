// Dance & Freeze - the disco tune. The engine's music player can only play or
// stop a song, so the game plays its own bouncy four-on-the-floor disco loop
// on the audio clock (marimba/bell lead, piano stabs, octave bass, kick, clap,
// shaker). Recorded inst/<id> samples are used when they exist, else synths.
//   start(bpm)  needle down: picks up where it left off
//   tell(dur)   the warning: tempo and pitch sag like a record slowing down
//   stop()      record scratch, silence
//   beat        visual beat counter (game time, so it also works muted)
import { audioCtx, sfxInput, soundBuffer, hasSound, sfx } from '../../engine/audio.js';
import { damp } from '../../engine/util.js';

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// 4 bars x 8 eighth-notes, played twice with a variation on the second pass.
const LEAD = [
  72, null, 74, 76, null, 79, 76, 74,
  72, null, 69, 72, null, 74, null, null,
  77, null, 76, 74, null, 72, 74, 76,
  79, null, 77, 76, 74, null, 72, null,
  72, null, 74, 76, null, 79, 81, 79,
  77, null, 76, 77, null, 79, null, null,
  81, 79, 77, 76, 74, 76, 77, 79,
  84, null, 79, null, 76, null, 72, null,
];
const CHORDS = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]];
const BASS = [36, 33, 29, 31];
const STEPS = LEAD.length;

export class Tune {
  constructor() {
    this.ac = null; this.bus = null; this.out = null;
    this.step = 0; this.nextAt = 0; this.playing = false;
    this.bpm = 124; this.rate = 1; this.rateTo = 1; this.pitch = 1; this.pitchTo = 1;
    this.voices = []; this.beat = 0; this.vol = 0.6; this.dead = false;
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
    this.bpm = bpm; this.playing = true;
    this.rate = this.rateTo = 1; this.pitch = this.pitchTo = 1;
    this.pendingStart = true; this.kick();
  }

  kick() {
    if (!this.pendingStart || !this.ensure()) return;
    this.pendingStart = false;
    const now = this.ac.currentTime, g = this.out.gain;
    g.cancelScheduledValues(now); g.setValueAtTime(Math.max(0.0001, g.value), now); g.linearRampToValueAtTime(this.vol, now + 0.05);
    this.nextAt = now + 0.04;
    this.step = this.step - (this.step % 8);       // restart on a bar line
  }

  tell(dur = 0.6) { this.rateTo = 0.55; this.pitchTo = 0.78; this.bendTo(0.78, dur * 0.45); }

  stop(scratchKey = null) {
    this.playing = false;
    if (this.pendingStart) { this.pendingStart = false; return; }
    if (!this.ensure()) return;
    const now = this.ac.currentTime, g = this.out.gain;
    this.bendTo(0.35, 0.05);
    g.cancelScheduledValues(now); g.setValueAtTime(Math.max(0.0001, g.value), now); g.linearRampToValueAtTime(0.0001, now + 0.14);
    if (scratchKey && hasSound(scratchKey)) sfx(scratchKey);
    else if (hasSound('cush-scratch')) sfx('cush-scratch');
    else this.scratch(now);
  }

  update(dt) {
    if (this.playing) {
      this.rate = damp(this.rate, this.rateTo, this.rateTo < this.rate ? 4 : 9, dt);
      this.pitch = damp(this.pitch, this.pitchTo, this.pitchTo < this.pitch ? 4 : 9, dt);
      this.beat += dt * (this.bpm / 60) * this.rate;
    }
    if (!this.playing || !this.ensure()) return;
    this.kick();
    const now = this.ac.currentTime;
    if (this.nextAt < now - 0.08) this.nextAt = now + 0.02;
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
    try { out.gain.cancelScheduledValues(now); out.gain.setValueAtTime(Math.max(0.0001, out.gain.value), now); out.gain.linearRampToValueAtTime(0.0001, now + 0.2); } catch (e) { /* closed */ }
    setTimeout(() => { try { out.disconnect(); bus.disconnect(); } catch (e) { /* gone */ } }, 400);
  }

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
    const len = Math.min(buf.duration / rate, 2);
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

  playStep(step, t) {
    const bar = Math.floor(step / 8) % 4, i = step % 8;
    const m = LEAD[step];
    if (m != null) {
      if (!this.sample('inst/marimba', m - 12 - 60, t, 0.7)) {
        const f = mtof(m) * this.pitch;
        this.osc('square', f, t, 0.06, 0.004, 0.18, 2400);
        this.osc('sine', f, t, 0.18, 0.004, 0.25);
      }
      if ((i === 0 || i === 4) && !this.sample('inst/bells', m - 72, t, 0.16)) this.osc('sine', mtof(m + 12) * this.pitch, t, 0.04, 0.003, 0.4);
    }
    // octave disco bass on every eighth
    this.osc('triangle', mtof(BASS[bar] + (i % 2 ? 12 : 0)) * this.pitch, t, 0.28, 0.005, this.stepDur * 0.9);
    // chord stabs on the off-beats
    if (i === 1 || i === 5 || i === 7) for (const c of CHORDS[bar]) if (!this.sample('inst/piano', c - 60, t, 0.2)) this.osc('triangle', mtof(c) * this.pitch, t, 0.07, 0.004, 0.14, 2800);
    // four on the floor
    if (i % 2 === 0 && !this.sample('inst/kick', 0, t, 0.7)) this.osc('sine', 110, t, 0.5, 0.002, 0.15);
    if ((i === 2 || i === 6) && !this.sample('inst/clap', 0, t, 0.42)) this.noise(t, 0.35, 0.1, 'bandpass', 1400, 1.2);
    if (!this.sample('inst/shaker', 0, t, i % 2 ? 0.24 : 0.14)) this.noise(t, 0.07, 0.04, 'highpass', 7000);
  }

  /** Synth record scratch (only when no recorded scratch exists). */
  scratch(t) {
    const ac = this.ac, bus = this.bus;
    const buf = ac.createBuffer(1, 8820, 44100); const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = ac.createBufferSource(); s.buffer = buf; s.loop = true;
    const fl = ac.createBiquadFilter(); fl.type = 'bandpass'; fl.Q.value = 3;
    fl.frequency.setValueAtTime(2600, t); fl.frequency.exponentialRampToValueAtTime(1100, t + 0.07);
    fl.frequency.setValueAtTime(2000, t + 0.08); fl.frequency.exponentialRampToValueAtTime(260, t + 0.3);
    const gn = ac.createGain();
    gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(0.5, t + 0.01);
    gn.gain.setValueAtTime(0.5, t + 0.06); gn.gain.exponentialRampToValueAtTime(0.12, t + 0.08);
    gn.gain.exponentialRampToValueAtTime(0.45, t + 0.1); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
    s.connect(fl); fl.connect(gn); gn.connect(bus);
    s.start(t); s.stop(t + 0.36);
  }
}
