import type { Move, RoundOutcome, Series } from "./types";
import { BEATS } from "./types";

export function neededWins(series: Series): number {
  return Math.ceil(series / 2);
}

export function judge(player: Move | null, bot: Move): RoundOutcome {
  if (!player) return "miss";
  if (player === bot) return "draw";
  return BEATS[player] === bot ? "win" : "lose";
}

export function matchOver(player: number, bot: number, series: Series): "player" | "bot" | null {
  const n = neededWins(series);
  if (player >= n) return "player";
  if (bot >= n) return "bot";
  return null;
}
