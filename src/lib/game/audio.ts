type Buses = { ctx: AudioContext; master: GainNode; sfx: GainNode };
let buses: Buses | null = null;
let muted = false;
export function unlockAudio() {
  const b = getBuses();
  if (b.ctx.state === "suspended") void b.ctx.resume();
}
export function setMuted(next: boolean) {
  muted = next;
  const b = buses;
  if (!b) return;
  b.master.gain.setTargetAtTime(next ? 0 : 1, b.ctx.currentTime, 0.02);
}
export function isMuted() { return muted; }
function getBuses(): Buses {
  if (buses) return buses;
  const ctx = new AudioContext({ latencyHint: "interactive" });
  const master = ctx.createGain();
  const sfx = ctx.createGain();
  sfx.gain.value = 0.85;
  sfx.connect(master);
  master.connect(ctx.destination);
  master.gain.value = muted ? 0 : 1;
  buses = { ctx, master, sfx };
  return buses;
}
function envGain(ctx: AudioContext, dest: AudioNode, t: number, dur: number, peak: number) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  g.connect(dest);
  return g;
}
function beep(freq: number, dur: number, type: OscillatorType = "square", peak = 0.18) {
  const { ctx, sfx } = getBuses();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  osc.connect(envGain(ctx, sfx, t, dur, peak));
  osc.start(t);
  osc.stop(t + dur + 0.02);
}
export function sfxCountdown(step: number) { beep(420 + step * 140, 0.12, "square", 0.16); }
export function sfxShoot() {
  const { ctx, sfx } = getBuses();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(140, t);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.22);
  osc.connect(envGain(ctx, sfx, t, 0.24, 0.28));
  osc.start(t);
  osc.stop(t + 0.26);
}
export function sfxWin() {
  [523, 659, 784, 1046].forEach((f, i) => { window.setTimeout(() => beep(f, 0.16, "triangle", 0.2), i * 70); });
}
export function sfxLose() {
  beep(196, 0.28, "sawtooth", 0.2);
  window.setTimeout(() => beep(130, 0.38, "triangle", 0.16), 90);
}
export function sfxDraw() {
  beep(330, 0.14, "triangle", 0.14);
  window.setTimeout(() => beep(330, 0.14, "triangle", 0.1), 160);
}
export function sfxMatchWin() {
  [392, 523, 659, 784, 1046].forEach((f, i) => { window.setTimeout(() => beep(f, 0.2, "triangle", 0.22), i * 90); });
}
export function resumeIfNeeded() {
  if (!buses) return;
  if (buses.ctx.state === "suspended") void buses.ctx.resume();
}
