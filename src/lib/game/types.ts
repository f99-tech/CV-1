export type Move = "rock" | "paper" | "scissors";
export type Series = 3 | 5 | 7 | 9;

export type Phase =
  | "title"
  | "setup"
  | "loading"
  | "idle"
  | "countdown"
  | "throwing"
  | "reveal"
  | "roundEnd"
  | "matchEnd";

export type RoundOutcome = "win" | "lose" | "draw" | "miss";

export type VisionSource = "gesture" | "geometry" | "manual";

export type Detection = {
  move: Move | null;
  gestureLabel: string;
  confidence: number;
  source: VisionSource;
  handedness: string;
  landmarks: Array<{ x: number; y: number; z?: number }> | null;
};

export const MOVES: Move[] = ["rock", "paper", "scissors"];

export const BEATS: Record<Move, Move> = {
  rock: "scissors",
  paper: "rock",
  scissors: "paper",
};
