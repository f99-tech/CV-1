import { create } from "zustand";
import { voteMove } from "./cv";
import { pickBotMove } from "./bot";
import { judge, matchOver } from "./rules";
import type { Detection, Move, Phase, RoundOutcome, Series } from "./types";

const THEME_KEY = "signlock-theme";
const LANG_KEY = "signlock-lang";
const MUTE_KEY = "signlock-mute";

export type Lang = "en" | "ar";

type HistoryItem = { player: Move; bot: Move; outcome: RoundOutcome };

type GameState = {
  lang: Lang;
  theme: "dark" | "light";
  muted: boolean;
  phase: Phase;
  series: Series;
  round: number;
  you: number;
  bot: number;
  countdown: number;
  throwLeft: number;
  holdLeft: number;
  playerMove: Move | null;
  botMove: Move | null;
  outcome: RoundOutcome | null;
  matchWinner: "player" | "bot" | null;
  votes: Detection[];
  live: Detection | null;
  history: HistoryItem[];
  trauma: number;
  cameraOn: boolean;
  cvReady: boolean;
  cvError: string | null;
  missed: boolean;
  lastBeep: number;
  setLang: (lang: Lang) => void;
  setTheme: (theme: "dark" | "light") => void;
  setMuted: (muted: boolean) => void;
  setSeries: (n: Series) => void;
  enterSetup: () => void;
  markCv: (ok: boolean, err?: string) => void;
  setCameraOn: (on: boolean) => void;
  setLive: (d: Detection | null) => void;
  startCountdown: () => void;
  tick: (dt: number) => void;
  playAgain: () => void;
  backTitle: () => void;
};

function collectVote(votes: Detection[], live: Detection | null) {
  if (!live?.move) return votes;
  return [...votes, live].slice(-36);
}

export function applyTheme(theme: "dark" | "light") {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("light", theme === "light");
}

export const useGame = create<GameState>((set, get) => ({
  lang: "en",
  theme: "dark",
  muted: false,
  phase: "title",
  series: 3,
  round: 1,
  you: 0,
  bot: 0,
  countdown: 0,
  throwLeft: 0,
  holdLeft: 0,
  playerMove: null,
  botMove: null,
  outcome: null,
  matchWinner: null,
  votes: [],
  live: null,
  history: [],
  trauma: 0,
  cameraOn: false,
  cvReady: false,
  cvError: null,
  missed: false,
  lastBeep: 4,
  setLang: (lang) => {
    window.localStorage.setItem(LANG_KEY, lang);
    set({ lang });
  },
  setTheme: (theme) => {
    window.localStorage.setItem(THEME_KEY, theme);
    applyTheme(theme);
    set({ theme });
  },
  setMuted: (muted) => {
    window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    set({ muted });
  },
  setSeries: (series) => set({ series }),
  enterSetup: () => set({ phase: "setup" }),
  markCv: (ok, err) => set({ cvReady: ok, cvError: err ?? null }),
  setCameraOn: (cameraOn) => set({ cameraOn }),
  setLive: (live) => set({ live }),
  startCountdown: () => {
    const s = get();
    if (!s.cameraOn) return;
    set({
      phase: "countdown",
      countdown: 3,
      lastBeep: 4,
      throwLeft: 0,
      playerMove: null,
      botMove: null,
      outcome: null,
      votes: [],
      missed: false,
    });
  },
  tick: (dt) => {
    const s = get();
    const trauma = Math.max(0, s.trauma - dt * 1.8);

    if (s.phase === "countdown") {
      const next = s.countdown - dt;
      const votes = collectVote(s.votes, s.live);
      if (next <= 0) {
        const botMove = pickBotMove(s.history.map((h) => ({ player: h.player, bot: h.bot })));
        set({
          phase: "throwing",
          countdown: 0,
          throwLeft: 1.05,
          botMove,
          trauma,
          votes,
        });
        return;
      }
      set({ countdown: next, trauma, votes });
      return;
    }

    if (s.phase === "throwing") {
      const votes = collectVote(s.votes, s.live);
      const left = s.throwLeft - dt;
      if (left <= 0) {
        const voted = voteMove(votes);
        const playerMove = voted.move;
        set({
          phase: "reveal",
          throwLeft: 0,
          holdLeft: 0.9,
          playerMove,
          votes,
          missed: !playerMove,
          trauma: Math.min(1, trauma + 0.55),
        });
        return;
      }
      set({ throwLeft: left, votes, trauma });
      return;
    }

    if (s.phase === "reveal") {
      const left = s.holdLeft - dt;
      if (left <= 0) {
        if (!s.playerMove) {
          set({
            phase: "idle",
            missed: true,
            holdLeft: 0,
            botMove: null,
            trauma,
          });
          return;
        }
        const botMove = s.botMove ?? "rock";
        const outcome = judge(s.playerMove, botMove);
        let you = s.you;
        let bot = s.bot;
        if (outcome === "win") you += 1;
        if (outcome === "lose") bot += 1;
        const history = [...s.history, { player: s.playerMove, bot: botMove, outcome }];
        const winner = matchOver(you, bot, s.series);
        set({
          phase: winner ? "matchEnd" : "roundEnd",
          you,
          bot,
          history,
          outcome,
          matchWinner: winner,
          holdLeft: winner ? 0 : 1.4,
          trauma: Math.min(1, trauma + (winner ? 0.9 : 0.25)),
        });
        return;
      }
      set({ holdLeft: left, trauma });
      return;
    }

    if (s.phase === "roundEnd") {
      const left = s.holdLeft - dt;
      if (left <= 0) {
        set({
          phase: "idle",
          round: s.round + 1,
          playerMove: null,
          botMove: null,
          outcome: null,
          holdLeft: 0,
          trauma,
        });
        return;
      }
      set({ holdLeft: left, trauma });
      return;
    }

    if (trauma !== s.trauma) set({ trauma });
  },
  playAgain: () =>
    set({
      phase: "idle",
      round: 1,
      you: 0,
      bot: 0,
      playerMove: null,
      botMove: null,
      outcome: null,
      matchWinner: null,
      history: [],
      votes: [],
      missed: false,
    }),
  backTitle: () =>
    set({
      phase: "title",
      round: 1,
      you: 0,
      bot: 0,
      playerMove: null,
      botMove: null,
      matchWinner: null,
      history: [],
    }),
}));
