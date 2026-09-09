import { useEffect, useRef } from "react";
import { SignGlyph } from "@/components/game/SignGlyph";
import { detectFrame, loadVision } from "@/lib/game/cv";
import { useGame } from "@/lib/game/store";
import { copy } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const CONNECTIONS: Array<[number, number]> = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [0, 17],
];

async function openCamera(): Promise<MediaStream> {
  const tries: MediaStreamConstraints[] = [
    {
      audio: false,
      video: { facingMode: { ideal: "user" }, width: { ideal: 640 }, height: { ideal: 480 } },
    },
    { audio: false, video: { facingMode: "user" } },
    { audio: false, video: true },
  ];
  let last: unknown;
  for (const constraint of tries) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraint);
    } catch (err) {
      last = err;
    }
  }
  throw last instanceof Error ? last : new Error("camera denied");
}

function armVideo(v: HTMLVideoElement, stream: MediaStream) {
  v.setAttribute("playsinline", "true");
  v.setAttribute("webkit-playsinline", "true");
  v.playsInline = true;
  v.muted = true;
  v.autoplay = true;
  v.srcObject = stream;
  return v.play().catch(() => undefined);
}

export function CameraStage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snapRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { cameraOn, setCameraOn, setLive, markCv, live, lang, phase, cvReady, cvError } = useGame();
  const t = copy[lang];

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        await loadVision();
        if (!dead) markCv(true);
      } catch (err) {
        if (!dead) markCv(false, err instanceof Error ? err.message : "vision failed");
      }
    })();
    return () => {
      dead = true;
    };
  }, [markCv]);

  useEffect(() => {
    if (!cameraOn) {
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      return;
    }
    let stop = false;
    (async () => {
      try {
        const stream = await openCamera();
        if (stop) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        streamRef.current = stream;
        const v = videoRef.current;
        if (!v) return;
        await armVideo(v, stream);
      } catch (err) {
        setCameraOn(false);
        markCv(useGame.getState().cvReady, err instanceof Error ? err.message : "camera denied");
      }
    })();
    return () => {
      stop = true;
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    };
  }, [cameraOn, markCv, setCameraOn]);

  useEffect(() => {
    let id = 0;
    const loop = (ts: number) => {
      const v = videoRef.current;
      const overlay = canvasRef.current;
      if (v && overlay && cameraOn && v.readyState >= 2 && v.videoWidth >= 16) {
        if (!snapRef.current) snapRef.current = document.createElement("canvas");
        const snap = snapRef.current;
        if (snap.width !== v.videoWidth || snap.height !== v.videoHeight) {
          snap.width = v.videoWidth;
          snap.height = v.videoHeight;
        }
        const sctx = snap.getContext("2d", { willReadFrequently: true });
        if (sctx) {
          sctx.drawImage(v, 0, 0);
          try {
            const det = detectFrame(snap, ts);
            setLive(det);
            drawHand(overlay, snap.width, snap.height, det.landmarks);
          } catch {
            // keep last live reading
          }
        }
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [cameraOn, setLive]);

  const signName =
    live?.move === "rock"
      ? t.throwRock
      : live?.move === "paper"
        ? t.throwPaper
        : live?.move === "scissors"
          ? t.throwScissors
          : null;

  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-elevated sm:aspect-square">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full scale-x-[-1] object-cover"
        playsInline
        muted
        autoPlay
      />
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full scale-x-[-1]"
      />
      <div className="scanlines pointer-events-none absolute inset-0" />
      {!cameraOn && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-elevated px-6 text-center">
          <p className="font-display text-lg text-fg">{t.cameraOff}</p>
          <p className="max-w-xs text-sm text-muted">{t.cameraNeed}</p>
          {cvError && <p className="max-w-xs text-xs text-primary">{cvError}</p>}
          <button
            type="button"
            className="min-h-11 rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg"
            onClick={() => setCameraOn(true)}
          >
            {t.allowCamera}
          </button>
        </div>
      )}
      {cameraOn && live?.move && (
        <div className="pointer-events-none absolute end-3 top-12 size-16 text-scan">
          <SignGlyph move={live.move} />
        </div>
      )}
      <div className="absolute start-3 top-3 rounded-full border border-border bg-bg/70 px-3 py-1 text-[11px] uppercase tracking-wider text-muted backdrop-blur">
        {t.you}
      </div>
      <div
        className={cn(
          "absolute bottom-3 start-3 end-3 rounded-lg border border-border bg-bg/75 px-3 py-2 text-xs backdrop-blur",
          live?.move ? "text-scan" : "text-muted",
        )}
      >
        {!cvReady
          ? t.loadingCv
          : phase === "throwing" || phase === "countdown"
            ? `${t.holdSign}${signName ? ` · ${signName}` : ""}`
            : signName
              ? `${t.seeing} · ${signName} · ${Math.round((live?.confidence ?? 0) * 100)}%`
              : t.noHand}
      </div>
    </div>
  );
}

function drawHand(
  canvas: HTMLCanvasElement,
  w: number,
  h: number,
  lm: Array<{ x: number; y: number }> | null,
) {
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  if (!lm) return;
  ctx.strokeStyle = "rgba(255,77,46,0.9)";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  for (const [a, b] of CONNECTIONS) {
    const pa = lm[a];
    const pb = lm[b];
    if (!pa || !pb) continue;
    ctx.beginPath();
    ctx.moveTo(pa.x * w, pa.y * h);
    ctx.lineTo(pb.x * w, pb.y * h);
    ctx.stroke();
  }
  ctx.fillStyle = "#5ce1c5";
  for (const p of lm) {
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}
