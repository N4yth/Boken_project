"use client";
import { useRef, type MouseEvent } from "react";
import { Plus, Check } from "lucide-react";
import Cover from "./Cover";
import { RatingBadge } from "./Rating";

type WebtoonCardProps = {
  id: string;
  title: string;
  authors: string;
  rating: number;
  totalChapters: number;
  onClick?: (id: string) => void;
  className?: string;
  index?: number;
  meta?: string;
  showFavorite?: boolean;
  isAddable?: boolean;
  releaseId?: string;
  onFavoriteClick?: (webtoonId: string, releaseId: string) => void;
  isFavoriteLoading?: boolean;
};

export default function WebtoonCard({
  id,
  title,
  authors,
  rating,
  totalChapters,
  onClick,
  className = "",
  index = 0,
  meta,
  showFavorite = false,
  isAddable = true,
  releaseId,
  onFavoriteClick,
  isFavoriteLoading = false,
}: WebtoonCardProps) {
  // Only play the stamp animation when the title gets added during this visit
  const startedAddable = useRef(isAddable);

  const handleAdd = (e: MouseEvent) => {
    e.stopPropagation();
    if (!isAddable || !releaseId || !onFavoriteClick) return;
    onFavoriteClick(id, releaseId);
  };

  const inLibrary = !isAddable;

  return (
    <article
      className={`group animate-rise ${className}`}
      style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}
    >
      <div className="relative">
        <button
          type="button"
          onClick={() => onClick?.(id)}
          className="block w-full rounded-[10px] text-left transition-transform duration-300 ease-out group-hover:-translate-y-1"
          aria-label={`Open ${title}`}
        >
          <Cover
            title={title}
            className="shadow-[0_1px_0_rgb(var(--line)),0_14px_28px_-18px_rgb(var(--ink)/0.55)]"
          />
        </button>

        {showFavorite && (
          <button
            type="button"
            onClick={handleAdd}
            disabled={inLibrary || isFavoriteLoading || !releaseId}
            title={!releaseId ? "No release yet" : inLibrary ? "In your library" : "Add to library"}
            aria-label={inLibrary ? `${title} is in your library` : `Add ${title} to library`}
            className={`absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full border shadow-sm transition-all ${
              inLibrary
                ? "border-transparent bg-jade text-sheet"
                : "border-line bg-sheet text-ink hover:scale-105 hover:bg-ink hover:text-paper disabled:opacity-50"
            }`}
          >
            {inLibrary ? (
              <Check className={`h-4 w-4 ${startedAddable.current ? "animate-pop" : ""}`} strokeWidth={2.5} />
            ) : (
              <Plus className="h-4 w-4" strokeWidth={2.5} />
            )}
          </button>
        )}
      </div>

      <button type="button" onClick={() => onClick?.(id)} className="mt-3 block w-full text-left">
        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug decoration-seal decoration-2 underline-offset-4 group-hover:underline">
          {title}
        </h3>
        <p className="mt-0.5 truncate text-[13px] text-muted">{authors}</p>
        <div className="mt-2 flex items-center gap-3 text-muted">
          <RatingBadge value={rating} className="text-ink" />
          <span className="font-mono text-xs tabular-nums">{totalChapters ?? 0} ch</span>
          {meta && <span className="truncate font-mono text-xs">{meta}</span>}
        </div>
      </button>
    </article>
  );
}
