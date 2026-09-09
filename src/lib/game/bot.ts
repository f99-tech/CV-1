import type { Move } from "./types";
import { MOVES } from "./types";

/** Light pattern bot: mostly random, slight win-stay / lose-shift so it feels alive. */
export function pickBotMove(history: Array<{ player: Move; bot: Move }>): Move {
  if (history.length === 0 || Math.random() < 0.62) {
    return MOVES[Math.floor(Math.random() * 3)]!;
  }
  const last = history[history.length - 1]!;
  const won =
    (last.bot === "rock" && last.player === "scissors") ||
    (last.bot === "paper" && last.player === "rock") ||
    (last.bot === "scissors" && last.player === "paper");
  if (won && Math.random() < 0.55) return last.bot;
  const shift: Record<Move, Move> = {
    rock: "paper",
    paper: "scissors",
    scissors: "rock",
  };
  return shift[last.bot];
}
