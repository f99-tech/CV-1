import type { Move } from "./types";

/** MediaPipe 21-point hand. Wrist = 0. */
export type Landmark = { x: number; y: number; z?: number };

export type FingerState = {
  thumb: boolean;
  index: boolean;
  middle: boolean;
  ring: boolean;
  pinky: boolean;
};

export type SignRecord = {
  move: Move;
  label: string;
  conf: number;
  match: (f: FingerState) => boolean;
};

function dist(a: Landmark, b: Landmark) {
  const dz = (a.z ?? 0) - (b.z ?? 0);
  return Math.hypot(a.x - b.x, a.y - b.y, dz);
}

function stretched(lm: Landmark[], tip: number, pip: number, wrist = 0) {
  return dist(lm[tip]!, lm[wrist]!) > dist(lm[pip]!, lm[wrist]!) * 1.08;
}

/**
 * RPS sign database derived from HaGRID finger configurations:
 * Closed_Fist, Open_Palm, Victory — plus loose real-world variants
 * (tucked thumb, partial curl, camera angle).
 */
export const RPS_SIGN_DB: SignRecord[] = [
  {
    move: "scissors",
    label: "db:victory",
    conf: 0.93,
    match: (f) => f.index && f.middle && !f.ring && !f.pinky,
  },
  {
    move: "paper",
    label: "db:open-palm",
    conf: 0.9,
    match: (f) => f.index && f.middle && f.ring && f.pinky,
  },
  {
    move: "rock",
    label: "db:closed-fist",
    conf: 0.9,
    match: (f) => !f.index && !f.middle && !f.ring && !f.pinky,
  },
  {
    move: "paper",
    label: "db:four-open",
    conf: 0.8,
    match: (f) => [f.index, f.middle, f.ring, f.pinky].filter(Boolean).length >= 3,
  },
  {
    move: "rock",
    label: "db:almost-fist",
    conf: 0.78,
    match: (f) => [f.index, f.middle, f.ring, f.pinky].filter(Boolean).length <= 1,
  },
];

export function fingerState(lm: Landmark[]): FingerState | null {
  if (lm.length < 21) return null;
  return {
    thumb: dist(lm[4]!, lm[8]!) > dist(lm[2]!, lm[5]!) * 0.85,
    index: stretched(lm, 8, 6),
    middle: stretched(lm, 12, 10),
    ring: stretched(lm, 16, 14),
    pinky: stretched(lm, 20, 18),
  };
}

export function lookupSign(lm: Landmark[]): { move: Move; conf: number; label: string } | null {
  const fingers = fingerState(lm);
  if (!fingers) return null;
  for (const row of RPS_SIGN_DB) {
    if (row.match(fingers)) return { move: row.move, conf: row.conf, label: row.label };
  }
  return null;
}
