"use client";
import { useState } from "react";
import { Star } from "lucide-react";

export function RatingBadge({ value, className = "" }: { value?: number; className?: string }) {
  const rating = Number(value ?? 0);
  return (
    <span className={`inline-flex items-center gap-1 font-mono text-xs tabular-nums ${className}`}>
      <Star className="h-3.5 w-3.5 fill-ochre text-ochre" />
      {rating.toFixed(1)}
    </span>
  );
}

type StarsProps = {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md";
  label?: string;
};

// Half-star precision: the left half of a star sets x.5, the right half sets x+1
export function Stars({ value, onChange, size = "md", label = "Rating" }: StarsProps) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value;
  const box = size === "sm" ? "h-4 w-4" : "h-6 w-6";
  const editable = !!onChange;

  return (
    <div
      className="inline-flex items-center gap-0.5"
      role={editable ? "slider" : "img"}
      aria-label={`${label}: ${value} out of 5`}
      aria-valuemin={editable ? 0 : undefined}
      aria-valuemax={editable ? 5 : undefined}
      aria-valuenow={editable ? value : undefined}
      tabIndex={editable ? 0 : undefined}
      onKeyDown={(e) => {
        if (!onChange) return;
        if (e.key === "ArrowRight" || e.key === "ArrowUp") onChange(Math.min(5, value + 0.5));
        if (e.key === "ArrowLeft" || e.key === "ArrowDown") onChange(Math.max(0, value - 0.5));
      }}
      onMouseLeave={() => setHover(null)}
    >
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = shown >= i + 1 ? 100 : shown >= i + 0.5 ? 50 : 0;
        return (
          <span
            key={i}
            className={`relative ${box} ${editable ? "cursor-pointer" : ""}`}
            onMouseMove={(e) => {
              if (!editable) return;
              const rect = e.currentTarget.getBoundingClientRect();
              setHover(e.clientX - rect.left < rect.width / 2 ? i + 0.5 : i + 1);
            }}
            onClick={() => {
              if (!onChange || hover === null) return;
              onChange(hover === value ? 0 : hover);
            }}
          >
            <Star className={`absolute inset-0 ${box} fill-line text-line`} strokeWidth={1.5} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill}%` }}>
              <Star className={`${box} fill-ochre text-ochre`} strokeWidth={1.5} />
            </span>
          </span>
        );
      })}
    </div>
  );
}
