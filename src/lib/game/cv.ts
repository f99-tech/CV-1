import type { Detection, Move } from "./types";
import { lookupSign, type Landmark } from "./rps-db";

function visionUrl(path: string) {
  const base = import.meta.env.BASE_URL || "/";
  const root = base.endsWith("/") ? base : `${base}/`;
  return `${root}${path.replace(/^\//, "")}`;
}

const WASM_LOCAL = visionUrl("vision/wasm");
const WASM_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm";
const HAND_MODEL = visionUrl("vision/hand_landmarker.task");
const GESTURE_MODEL = visionUrl("vision/gesture_recognizer.task");

type VisionFrame = HTMLVideoElement | HTMLCanvasElement | HTMLImageElement;

type HandsResult = {
  landmarks?: Landmark[][];
  handedness?: Array<Array<{ categoryName: string; score?: number }>>;
};

type GestureResult = {
  gestures?: Array<Array<{ categoryName: string; score: number }>>;
  landmarks?: Landmark[][];
  handedness?: Array<Array<{ categoryName: string }>>;
};

type VisionMod = {
  FilesetResolver: { forVisionTasks: (p: string) => Promise<unknown> };
  HandLandmarker: {
    createFromOptions: (
      files: unknown,
      opts: Record<string, unknown>,
    ) => Promise<{ detect: (image: VisionFrame) => HandsResult; close: () => void }>;
  };
  GestureRecognizer: {
    createFromOptions: (
      files: unknown,
      opts: Record<string, unknown>,
    ) => Promise<{ recognize: (image: VisionFrame) => GestureResult; close: () => void }>;
  };
};

let hands: Awaited<ReturnType<VisionMod["HandLandmarker"]["createFromOptions"]>> | null = null;
let gestures: Awaited<ReturnType<VisionMod["GestureRecognizer"]["createFromOptions"]>> | null = null;
let loadPromise: Promise<void> | null = null;

export function loadVision(): Promise<void> {
  if (hands) return Promise.resolve();
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const mod = (await import("@mediapipe/tasks-vision")) as unknown as VisionMod;
    let files: unknown;
    try {
      files = await mod.FilesetResolver.forVisionTasks(WASM_LOCAL);
    } catch {
      files = await mod.FilesetResolver.forVisionTasks(WASM_CDN);
    }
    hands = await mod.HandLandmarker.createFromOptions(files, {
      baseOptions: { modelAssetPath: HAND_MODEL, delegate: "CPU" },
      runningMode: "IMAGE",
      numHands: 1,
      minHandDetectionConfidence: 0.2,
      minHandPresenceConfidence: 0.2,
      minTrackingConfidence: 0.2,
    });
    try {
      gestures = await mod.GestureRecognizer.createFromOptions(files, {
        baseOptions: { modelAssetPath: GESTURE_MODEL, delegate: "CPU" },
        runningMode: "IMAGE",
        numHands: 1,
        minHandDetectionConfidence: 0.2,
        minHandPresenceConfidence: 0.2,
      });
    } catch {
      gestures = null;
    }
  })().catch((err) => {
    loadPromise = null;
    throw err;
  });
  return loadPromise;
}

export function visionReady() {
  return Boolean(hands);
}

const GESTURE_MAP: Record<string, Move> = {
  Closed_Fist: "rock",
  Open_Palm: "paper",
  Victory: "scissors",
};

export function detectFrame(frame: VisionFrame): Detection {
  const empty: Detection = {
    move: null,
    gestureLabel: "none",
    confidence: 0,
    source: "geometry",
    handedness: "",
    landmarks: null,
  };
  if (!hands) return empty;

  let lm: Landmark[] | null = null;
  let hand = "";
  let gMove: Move | null = null;
  let gScore = 0;
  let gLabel = "none";

  try {
    const h = hands.detect(frame);
    lm = h.landmarks?.[0] ?? null;
    hand = h.handedness?.[0]?.[0]?.categoryName ?? "";
  } catch {
    return empty;
  }

  if (gestures) {
    try {
      const g = gestures.recognize(frame);
      if (!lm) lm = g.landmarks?.[0] ?? null;
      const top = g.gestures?.[0]?.[0];
      if (top && GESTURE_MAP[top.categoryName] && top.score >= 0.35) {
        gMove = GESTURE_MAP[top.categoryName]!;
        gScore = top.score;
        gLabel = top.categoryName;
      }
    } catch {
      // hand landmarks still usable
    }
  }

  const db = lm ? lookupSign(lm) : null;

  let move: Move | null = null;
  let source: Detection["source"] = "geometry";
  let conf = 0;
  let label = "none";

  if (db) {
    move = db.move;
    conf = db.conf;
    label = db.label;
    source = "geometry";
  }
  if (gMove && gScore >= 0.5 && (!move || gScore > conf)) {
    move = gMove;
    conf = gScore;
    label = gLabel;
    source = "gesture";
  } else if (gMove && db && gMove === db.move) {
    move = gMove;
    conf = Math.max(gScore, db.conf);
    label = `${db.label}+${gLabel}`;
    source = "gesture";
  }

  return {
    move,
    gestureLabel: label,
    confidence: conf,
    source,
    handedness: hand,
    landmarks: lm,
  };
}

export function voteMove(buffer: Detection[]): { move: Move | null; conf: number } {
  const counts: Record<Move, number> = { rock: 0, paper: 0, scissors: 0 };
  let n = 0;
  for (const d of buffer) {
    if (!d.move || d.confidence < 0.3) continue;
    counts[d.move] += d.confidence;
    n += 1;
  }
  if (n < 1) {
    const last = [...buffer].reverse().find((d) => d.move);
    return { move: last?.move ?? null, conf: last?.confidence ?? 0 };
  }
  let best: Move = "rock";
  let score = -1;
  (Object.keys(counts) as Move[]).forEach((k) => {
    if (counts[k] > score) {
      score = counts[k];
      best = k;
    }
  });
  return { move: score <= 0 ? null : best, conf: n ? score / n : 0 };
}
