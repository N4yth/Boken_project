import type { CSSProperties } from "react";

// Printed-cover look while the API has no artwork: each title gets a stable
// colorway and screen tone so the shelf stays readable at a glance.
const COLORWAYS: [string, string][] = [
  ["#1B3A70", "#F3EFE6"],
  ["#C8412B", "#FBF3E8"],
  ["#1F6B57", "#EAF2EC"],
  ["#D9A23A", "#1E1A14"],
  ["#5B2A4E", "#F6E9EF"],
  ["#191C24", "#E9E4D8"],
  ["#8FB3D9", "#10213F"],
  ["#E9B9A9", "#3A1A14"],
];

function hash(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

type CoverProps = {
  title: string;
  seed?: string;
  chapters?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export default function Cover({ title, seed, chapters, size = "md", className = "" }: CoverProps) {
  const h = hash(seed || title || "boken");
  const [bg, fg] = COLORWAYS[h % COLORWAYS.length];
  const variant = (h >>> 4) % 3;
  const focusX = 20 + ((h >>> 8) % 60);
  const focusY = 10 + ((h >>> 12) % 40);

  const words = (title || "Untitled").split(/\s+/).slice(0, 5).join(" ");
  // Sized against the cover width so the same cover works from thumbnail to hero
  const titleSize = words.length > 28 ? 9.5 : words.length > 14 ? 11.5 : 14;

  const pattern: CSSProperties =
    variant === 1
      ? {
          // Focus lines, the classic manga impact effect
          backgroundImage: `repeating-conic-gradient(from 0deg at ${focusX}% ${focusY}%, currentColor 0deg 1.1deg, transparent 1.1deg 7deg)`,
          WebkitMaskImage: `radial-gradient(circle at ${focusX}% ${focusY}%, transparent 18%, black 70%)`,
          maskImage: `radial-gradient(circle at ${focusX}% ${focusY}%, transparent 18%, black 70%)`,
        }
      : {
          backgroundImage: "radial-gradient(currentColor 1.1px, transparent 1.5px)",
          backgroundSize: size === "lg" ? "9px 9px" : "6px 6px",
          WebkitMaskImage: `linear-gradient(${(h % 180) + 90}deg, transparent 20%, black 90%)`,
          maskImage: `linear-gradient(${(h % 180) + 90}deg, transparent 20%, black 90%)`,
        };

  return (
    <div
      className={`relative isolate aspect-[3/4] overflow-hidden ${size === "sm" ? "rounded-md" : "rounded-[10px]"} ${className}`}
      style={{ backgroundColor: bg, color: fg, containerType: "inline-size" }}
      aria-hidden="true"
    >
      <div className="absolute inset-0 opacity-25" style={pattern} />
      {variant === 2 && (
        <div
          className="absolute aspect-square w-[85%] rounded-full opacity-20"
          style={{ backgroundColor: fg, left: `${focusX - 30}%`, top: `${focusY - 25}%` }}
        />
      )}
      <div className="grain absolute inset-0 opacity-[0.12] mix-blend-overlay" />

      {size !== "sm" && (
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-2.5 font-mono text-[10px] uppercase tracking-[0.12em] opacity-80">
          <span>Boken</span>
          {chapters !== undefined && <span>Ch.{String(chapters).padStart(3, "0")}</span>}
        </div>
      )}

      <div className={`absolute inset-x-0 bottom-0 ${size === "sm" ? "p-1.5" : size === "lg" ? "p-5" : "p-3"}`}>
        <p className="display line-clamp-4 break-words" style={{ fontSize: `${titleSize}cqw` }}>
          {words}
        </p>
      </div>
    </div>
  );
}
