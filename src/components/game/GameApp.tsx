import { useEffect, useRef, type ReactNode } from "react";
import {
  Camera,
  Languages,
  Moon,
  Play,
  RotateCcw,
  Sun,
  Volume2,
  VolumeX,
} from "lucide-react";
import { CameraStage } from "@/components/game/CameraStage";
import { SignGlyph } from "@/components/game/SignGlyph";
import {
  resumeIfNeeded,
  setMuted as setAudioMuted,
  sfxCountdown,
  sfxDraw,
  sfxLose,
  sfxMatchWin,
  sfxShoot,
  sfxWin,
  unlockAudio,
} from "@/lib/game/audio";
import { neededWins } from "@/lib/game/rules";
import { applyTheme, useGame } from "@/lib/game/store";
import type { Series } from "@/lib/game/types";
import { copy } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const SERIES: Series[] = [3, 5, 7, 9];

export function GameApp() {
  const lang = useGame((s) => s.lang);
  const theme = useGame((s) => s.theme);
  const phase = useGame((s) => s.phase);
  const t = copy[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    const lang = window.localStorage.getItem("signlock-lang") === "ar" ? "ar" : "en";
    const theme = window.localStorage.getItem("signlock-theme") === "light" ? "light" : "dark";
    const muted = window.localStorage.getItem("signlock-mute") === "1";
    useGame.setState({ lang, theme, muted });
    applyTheme(theme);
    setAudioMuted(muted);
    const onVis = () => {
      if (document.visibilityState === "visible") resumeIfNeeded();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    let last = performance.now();
    let id = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      useGame.getState().tick(dt);
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, []);

  useBeeps();

  const shake = useGame((s) => s.trauma);
  const offset = shake * shake * 10;

  return (
    <div
      dir={dir}
      lang={lang}
      className="relative min-h-dvh overflow-hidden bg-bg text-fg"
      style={{
        transform:
          shake > 0.05
            ? `translate(${(Math.random() - 0.5) * offset}px, ${(Math.random() - 0.5) * offset}px)`
            : undefined,
      }}
    >
      <div className="arena-grid pointer-events-none absolute inset-0 opacity-70" />
      <div className="pointer-events-none absolute -top-24 start-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
      <header className="relative z-10 flex items-center justify-between gap-2 px-4 py-3">
        <button
          type="button"
          className="font-display text-lg tracking-tight"
          onClick={() => useGame.getState().backTitle()}
        >
          {t.title}
        </button>
        <div className="flex items-center gap-1">
          <IconBtn
            label={t.lang}
            onClick={() => useGame.getState().setLang(lang === "en" ? "ar" : "en")}
          >
            <Languages className="size-4" />
          </IconBtn>
          <IconBtn
            label={theme === "dark" ? t.light : t.dark}
            onClick={() => useGame.getState().setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </IconBtn>
          <MuteBtn />
        </div>
      </header>
      {phase === "title" || phase === "setup" ? <Lobby /> : <Arena />}
    </div>
  );
}

function useBeeps() {
  const last = useRef(4);
  const lastPhase = useRef(useGame.getState().phase);
  const lastOutcome = useRef(useGame.getState().outcome);

  useEffect(() => {
    let id = 0;
    const loop = () => {
      const s = useGame.getState();
      if (s.muted) {
        last.current = Math.ceil(s.countdown);
        lastPhase.current = s.phase;
        lastOutcome.current = s.outcome;
        id = requestAnimationFrame(loop);
        return;
      }
      if (s.phase === "countdown") {
        const step = Math.ceil(s.countdown);
        if (step !== last.current && step >= 1 && step <= 3) {
          last.current = step;
          sfxCountdown(4 - step);
          if (navigator.vibrate) navigator.vibrate(30);
        }
      }
      if (s.phase !== lastPhase.current) {
        if (s.phase === "throwing") {
          sfxShoot();
          if (navigator.vibrate) navigator.vibrate([20, 40, 80]);
        }
        lastPhase.current = s.phase;
      }
      if (s.outcome !== lastOutcome.current) {
        lastOutcome.current = s.outcome;
        if (s.phase === "roundEnd" || s.phase === "matchEnd") {
          if (s.matchWinner === "player") sfxMatchWin();
          else if (s.outcome === "win") sfxWin();
          else if (s.outcome === "lose" || s.outcome === "miss") sfxLose();
          else if (s.outcome === "draw") sfxDraw();
        }
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, []);
}

function Lobby() {
  const lang = useGame((s) => s.lang);
  const series = useGame((s) => s.series);
  const phase = useGame((s) => s.phase);
  const t = copy[lang];

  return (
    <main className="relative z-10 mx-auto flex min-h-[calc(100dvh-56px)] w-full max-w-lg flex-col justify-center px-5 pb-10">
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-primary">{t.tag}</p>
      <h1 className="mt-3 font-display text-5xl leading-none sm:text-6xl">{t.title}</h1>
      <p className="mt-4 max-w-md text-sm text-muted">{t.blurb}</p>

      {phase === "title" ? (
        <button
          type="button"
          className="mt-10 flex min-h-14 items-center justify-center gap-2 rounded-full bg-primary px-8 font-display text-xl text-primary-fg"
          onClick={() => {
            unlockAudio();
            useGame.getState().enterSetup();
          }}
        >
          <Play className="size-5" fill="currentColor" />
          {t.tapStart}
        </button>
      ) : (
        <div className="mt-8 space-y-6">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted">{t.bestOf}</p>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {SERIES.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => useGame.getState().setSeries(n)}
                  className={cn(
                    "min-h-12 rounded-xl border font-display text-lg",
                    series === n
                      ? "border-primary bg-primary text-primary-fg"
                      : "border-border bg-surface text-fg",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">
              {t.firstTo} {neededWins(series)}
            </p>
          </div>
          <button
            type="button"
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-primary font-display text-xl text-primary-fg"
            onClick={() => {
              unlockAudio();
              useGame.setState({ phase: "idle" });
              useGame.getState().setCameraOn(true);
            }}
          >
            <Camera className="size-5" />
            {t.startMatch}
          </button>
          <details className="rounded-xl border border-border bg-surface px-4 py-3">
            <summary className="cursor-pointer font-medium">{t.how}</summary>
            <p className="mt-2 text-sm text-muted">{t.howBody}</p>
            <ul className="mt-3 space-y-1 text-sm text-muted">
              <li>{t.source1}</li>
              <li>{t.source2}</li>
              <li>{t.source3}</li>
            </ul>
          </details>
        </div>
      )}
    </main>
  );
}

function Arena() {
  const lang = useGame((s) => s.lang);
  const t = copy[lang];
  const you = useGame((s) => s.you);
  const bot = useGame((s) => s.bot);
  const series = useGame((s) => s.series);
  const round = useGame((s) => s.round);
  const phase = useGame((s) => s.phase);
  const countdown = useGame((s) => s.countdown);
  const playerMove = useGame((s) => s.playerMove);
  const botMove = useGame((s) => s.botMove);
  const outcome = useGame((s) => s.outcome);
  const matchWinner = useGame((s) => s.matchWinner);
  const missed = useGame((s) => s.missed);
  const cameraOn = useGame((s) => s.cameraOn);
  const cvReady = useGame((s) => s.cvReady);

  const countLabel =
    phase === "countdown" ? String(Math.max(1, Math.ceil(countdown))) : phase === "throwing" ? t.shoot : null;

  const banner =
    phase === "matchEnd"
      ? matchWinner === "player"
        ? t.matchWin
        : t.matchLose
      : phase === "roundEnd"
        ? outcome === "win"
          ? t.winRound
          : outcome === "lose"
            ? t.loseRound
            : t.drawRound
        : missed
          ? t.missed
          : null;

  const youLabel =
    playerMove === "rock" ? t.throwRock : playerMove === "paper" ? t.throwPaper : playerMove === "scissors" ? t.throwScissors : playerMove;

  return (
    <main className="relative z-10 mx-auto w-full max-w-3xl px-4 pb-8">
      <div className="flex items-end justify-between gap-3">
        <ScoreCard label={t.you} value={you} />
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted">
            {t.round} {round}
          </p>
          <p className="font-display text-sm text-fg">
            {t.bestOf} {series}
          </p>
        </div>
        <ScoreCard label={t.bot} value={bot} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <CameraStage />
        <div className="relative flex aspect-[4/5] flex-col items-center justify-center overflow-hidden rounded-xl border border-border bg-surface sm:aspect-square">
          <div className="absolute start-3 top-3 rounded-full border border-border bg-bg/70 px-3 py-1 text-[11px] uppercase tracking-wider text-muted">
            {t.bot}
          </div>
          <div
            className={cn(
              "size-36 text-fg transition-transform duration-300",
              phase === "reveal" || phase === "roundEnd" || phase === "matchEnd"
                ? "scale-100"
                : "scale-90 opacity-70",
            )}
          >
            <SignGlyph
              move={
                phase === "reveal" || phase === "roundEnd" || phase === "matchEnd" ? botMove : "bot"
              }
            />
          </div>
          {(phase === "reveal" || phase === "roundEnd" || phase === "matchEnd") && botMove && (
            <p className="mt-2 font-display text-xl uppercase">{botMove}</p>
          )}
        </div>
      </div>

      {countLabel && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <div
            key={countLabel}
            className="font-display text-8xl text-primary"
            style={{ animation: "count-pop 280ms ease-out" }}
          >
            {countLabel}
          </div>
        </div>
      )}

      {banner && (
        <p className="mt-4 text-center font-display text-2xl text-primary">{banner}</p>
      )}

      {playerMove && (phase === "reveal" || phase === "roundEnd" || phase === "matchEnd") && (
        <p className="mt-1 text-center text-sm text-muted">
          {t.you}: {youLabel}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        {phase === "idle" && (
          <button
            type="button"
            className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-primary font-semibold text-primary-fg disabled:opacity-60"
            onClick={() => {
              unlockAudio();
              const s = useGame.getState();
              if (!s.cameraOn) {
                s.setCameraOn(true);
                return;
              }
              if (!s.cvReady) return;
              s.startCountdown();
            }}
          >
            {!cameraOn ? (
              <>
                <Camera className="size-4" />
                {t.allowCamera}
              </>
            ) : !cvReady ? (
              t.loadingCv
            ) : (
              <>
                <Play className="size-4" fill="currentColor" />
                {t.countdown}
              </>
            )}
          </button>
        )}
        {phase === "matchEnd" && (
          <button
            type="button"
            className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-primary font-semibold text-primary-fg"
            onClick={() => useGame.getState().playAgain()}
          >
            <RotateCcw className="size-4" />
            {t.playAgain}
          </button>
        )}
      </div>
    </main>
  );
}

function ScoreCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-20 rounded-xl border border-border bg-surface px-4 py-2 text-center">
      <p className="text-[11px] uppercase tracking-widest text-muted">{label}</p>
      <p className="font-display text-3xl tabular-nums">{value}</p>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  label,
}: {
  children: ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid size-11 place-items-center rounded-full border border-border bg-surface text-fg"
    >
      {children}
    </button>
  );
}

function MuteBtn() {
  const muted = useGame((s) => s.muted);
  const lang = useGame((s) => s.lang);
  const t = copy[lang];
  return (
    <IconBtn
      label={muted ? t.unmute : t.mute}
      onClick={() => {
        const next = !useGame.getState().muted;
        useGame.getState().setMuted(next);
        setAudioMuted(next);
        unlockAudio();
      }}
    >
      {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
    </IconBtn>
  );
}
