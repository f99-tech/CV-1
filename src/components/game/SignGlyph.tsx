import type { Move } from "@/lib/game/types";
import { cn } from "@/lib/utils";

export function SignGlyph({
  move,
  className,
}: {
  move: Move | "bot" | "unknown" | null;
  className?: string;
}) {
  if (move === "rock") return <RockIcon className={className} />;
  if (move === "paper") return <PaperIcon className={className} />;
  if (move === "scissors") return <ScissorsIcon className={className} />;
  if (move === "bot") return <BotIcon className={className} />;
  return <UnknownIcon className={className} />;
}

function svgCls(className?: string) {
  return cn("h-full w-full", className);
}

function RockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={svgCls(className)} fill="none" aria-hidden>
      <path
        d="M18 36c0-7 4-16 14-16 3 0 5 1 7 3 1-5 5-9 11-9 6 0 10 5 10 11 0 2-.5 4-1.4 5.6C60 33 62 37 62 42c0 8-7 14-18 14H24C16 56 12 50 12 44c0-3 1.2-6 3.4-8.2"
        fill="currentColor"
        fillOpacity="0.18"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path
        d="M22 40h20M20 46h18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}

function PaperIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={svgCls(className)} fill="none" aria-hidden>
      <path
        d="M20 54V18c0-4 3-8 8-8h2c4 0 6 3 6 6v10M36 16c0-3 3-6 6-6s6 3 6 6v14M48 22c3 0 6 3 6 7v17c0 8-6 14-16 14H26c-8 0-12-5-12-12V32"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M20 54c0-6 6-10 14-10" stroke="currentColor" strokeWidth="2" opacity="0.45" />
    </svg>
  );
}

function ScissorsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={svgCls(className)} fill="none" aria-hidden>
      <path
        d="M28 30c-8 10-16 16-16 24 0 6 5 8 10 8s9-3 9-8c0-6-4-10-8-14M36 30c8 10 16 16 16 24 0 6-5 8-10 8s-9-3-9-8c0-6 4-10 8-14"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M24 8c2 10 6 18 8 22M40 8c-2 10-6 18-8 22"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BotIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={svgCls(className)} fill="none" aria-hidden>
      <rect x="14" y="18" width="36" height="30" rx="8" stroke="currentColor" strokeWidth="2.4" />
      <circle cx="26" cy="32" r="4" fill="currentColor" />
      <circle cx="38" cy="32" r="4" fill="currentColor" />
      <path d="M32 18V10M24 10h16" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M24 42h16" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M14 30H8M50 30h6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function UnknownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={svgCls(className)} fill="none" aria-hidden>
      <circle cx="32" cy="32" r="18" stroke="currentColor" strokeWidth="2.4" opacity="0.5" />
      <path
        d="M26 28c0-4 3-7 7-7s7 3 6 7c-1 4-6 4-6 9"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="32" cy="44" r="2" fill="currentColor" />
    </svg>
  );
}
