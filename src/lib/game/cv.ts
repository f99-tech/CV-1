import type { Detection, Move } from "./types";

const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm";
const MODEL =
  "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task";

type Landmark = { x: number; y: number; z?: number };

type GestureApi = {
  FilesetResolver: { forVisionTasks: (p: string) => Promise<unknown> };
  GestureRecognizer: {
    createFromOptions: (
      files: unknown,
      opts: Record<string, unknown>,
    ) => Promise<{
      detectForVideo: (
        video: HTMLVideoElement,
        ts: number,
      ) => {
        gestures: Array<Array<{ categoryName: string; score: number }>>;
        landmarks: Landmark[][];
        handedness: Array<Array<{ categoryName: string }>>;
      };
      close: () => void;
    }>;
  };
};

let recognizer: Awaited<ReturnType<GestureApi["GestureRecognizer"]["createFromOptions"]>> | null =
  null;
let loadPromise: Promise<void> | null = null;

export function loadVision(): Promise<void> {
  if (recognizer) return Promise.resolve();
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const mod = (await import("@mediapipe/tasks-vision")) as unknown as GestureApi;
    const files = await mod.FilesetResolver.forVisionTasks(WASM);
    recognizer = await mod.GestureRecognizer.createFromOptions(files, {
      baseOptions: { modelAssetPath: MODEL },
      runningMode: "VIDEO",
      numHands: 1,
      minHandDetectionConfidence: 0.55,
      minTrackingConfidence: 0.5,
    });
  })();
  return loadPromise;
}

export function visionReady() {
  return Boolean(recognizer);
}

const GESTURE_MAP: Record<string, Move> = {
  Closed_Fist: "rock",
  Open_Palm: "paper",
  Victory: "scissors",
};

function dist(a: Landmark, b: Landmark) {
  const dz = (a.z ?? 0) - (b.z ?? 0);
  return Math.hypot(a.x - b.x, a.y - b.y, dz);
}

function extended(lm: Landmark[], tip: number, pip: number, mcp: number) {
  return dist(lm[tip]!, lm[mcp]!) > dist(lm[pip]!, lm[mcp]!) * 1.18;
}

export function classifyGeometry(lm: Landmark[]): { move: Move | null; conf: number; label: string } {
  if (lm.length < 21) return { move: null, conf: 0, label: "none" };
  const index = extended(lm, 8, 6, 5);
  const middle = extended(lm, 12, 10, 9);
  const ring = extended(lm, 16, 14, 13);
  const pinky = extended(lm, 20, 18, 17);
  const thumb = dist(lm[4]!, lm[0]!) > dist(lm[2]!, lm[0]!) * 1.15;
  const open = Number(index) + Number(middle) + Number(ring) + Number(pinky);
  if (index && middle && !ring && !pinky) return { move: "scissors", conf: 0.82, label: "geometry:V" };
  if (open >= 4 && thumb) return { move: "paper", conf: 0.8, label: "geometry:palm" };
  if (open <= 1) return { move: "rock", conf: 0.78, label: "geometry:fist" };
  return { move: null, conf: 0.2, label: "geometry:ambiguous" };
}

export function detectFrame(video: HTMLVideoElement, ts: number): Detection {
  const empty: Detection = {
    move: null, gestureLabel: "none", confidence: 0, source: "gesture", handedness: "", landmarks: null,
  };
  if (!recognizer || video.readyState < 2) return empty;
  const result = recognizer.detectForVideo(video, ts);
  const lm = result.landmarks?.[0] ?? null;
  const g = result.gestures?.[0]?.[0];
  const hand = result.handedness?.[0]?.[0]?.categoryName ?? "";
  const geo = lm ? classifyGeometry(lm) : { move: null, conf: 0, label: "none" };
  const gMove = g ? (GESTURE_MAP[g.categoryName] ?? null) : null;
  const gScore = g?.score ?? 0;
  let move: Move | null = null;
  let source: Detection["source"] = "gesture";
  let conf = 0;
  let label = "none";
  if (gMove && gScore >= 0.55) {
    move = gMove; conf = gScore; label = g.categoryName; source = "gesture";
    if (geo.move && geo.move !== gMove && geo.conf > gScore) {
      move = geo.move; conf = geo.conf; label = geo.label; source = "geometry";
    }
  } else if (geo.move) {
    move = geo.move; conf = geo.conf; label = geo.label; source = "geometry";
  }
  return { move, gestureLabel: label, confidence: conf, source, handedness: hand, landmarks: lm };
}

export function voteMove(buffer: Detection[]): { move: Move | null; conf: number } {
  const counts: Record<Move, number> = { rock: 0, paper: 0, scissors: 0 };
  let n = 0;
  for (const d of buffer) {
    if (!d.move || d.confidence < 0.45) continue;
    counts[d.move] += d.confidence;
    n += 1;
  }
  if (n < 2) {
    const last = [...buffer].reverse().find((d) => d.move);
    return { move: last?.move ?? null, conf: last?.confidence ?? 0 };
  }
  let best: Move = "rock";
  let score = -1;
  (Object.keys(counts) as Move[]).forEach((k) => {
    if (counts[k] > score) { score = counts[k]; best = k; }
  });
  return { move: score <= 0 ? null : best, conf: n ? score / n : 0 };
}
