"use client";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, SlidersHorizontal, X } from "lucide-react";
import WebtoonCard from "@/components/Webtoon_card";
import { Button, Container, EmptyState, PageHeader, SearchInput, ShelfSkeleton } from "@/components/ui";
import { useAuth } from "@/utils/userAuth";
import { api } from "@/lib/api";
import { WEBTOON_STATUS } from "@/lib/format";
import { useAddToLibrary, useOpenWebtoon, usePaged } from "@/lib/hooks";
import type { Genre, Webtoon } from "@/lib/types";

const EMPTY_FILTERS = {
  title: "",
  author: "",
  status: "",
  minChapters: "",
  maxChapters: "",
  minRating: "",
  maxRating: "",
};

type Filters = typeof EMPTY_FILTERS;

export default function AdvancedSearch() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [results, setResults] = useState<Webtoon[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const { isLogged, mounted } = useAuth();
  const openWebtoon = useOpenWebtoon();

  const markAdded = useCallback((id: string) => {
    setResults((prev) => prev.map((w) => (w.id === id ? { ...w, addable: false } : w)));
  }, []);
  const { add, pending } = useAddToLibrary(markAdded);

  useEffect(() => {
    api<Genre[]>("/api/genre/", { auth: false })
      .then(setGenres)
      .catch((err) => console.error("Failed to fetch genres:", err));
  }, []);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.title.trim()) p.append("title", filters.title.trim());
    if (filters.author.trim()) p.append("author", filters.author.trim());
    if (filters.minChapters) p.append("min_chapters", filters.minChapters);
    if (filters.maxChapters) p.append("max_chapters", filters.maxChapters);
    if (filters.minRating) p.append("min_rating", filters.minRating);
    if (filters.maxRating) p.append("max_rating", filters.maxRating);
    if (filters.status) p.append("status", filters.status);
    selectedGenres.forEach((id) => p.append("genres", id));
    return p.toString();
  }, [filters, selectedGenres]);

  // Results follow the filters as you type
  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      api<Webtoon[]>(`/api/webtoon/search/${params ? `?${params}` : ""}`)
        .then((data) => !cancelled && setResults(data))
        .catch((err) => {
          console.error("Search failed:", err);
          if (!cancelled) setResults([]);
        })
        .finally(() => !cancelled && setLoading(false));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [params, mounted, isLogged]);

  const set = (key: keyof Filters, value: string) => setFilters((prev) => ({ ...prev, [key]: value }));

  const toggleGenre = (id: string) =>
    setSelectedGenres((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));

  const clearAll = () => {
    setFilters(EMPTY_FILTERS);
    setSelectedGenres([]);
  };

  const activeCount =
    Object.entries(filters).filter(([key, value]) => key !== "title" && value).length + (selectedGenres.length > 0 ? 1 : 0);
  const { visible, sentinel, hasMore } = usePaged(results);

  const panel = (
    <div className="space-y-7">
      <FilterGroup label="Author">
        <input
          value={filters.author}
          onChange={(e) => set("author", e.target.value)}
          placeholder="Any author"
          className="field"
        />
      </FilterGroup>

      <FilterGroup label="Publication">
        <div className="flex flex-wrap gap-2">
          {[{ value: "", label: "Any" }, ...WEBTOON_STATUS].map((s) => (
            <button
              key={s.value || "any"}
              type="button"
              aria-pressed={filters.status === s.value}
              onClick={() => set("status", s.value)}
              className={`chip ${filters.status === s.value ? "border-ink bg-ink text-paper" : "bg-sheet hover:border-ink/40"}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup label="Chapters">
        <Range
          min={filters.minChapters}
          max={filters.maxChapters}
          onMin={(v) => set("minChapters", v)}
          onMax={(v) => set("maxChapters", v)}
        />
      </FilterGroup>

      <FilterGroup label="Rating">
        <Range
          min={filters.minRating}
          max={filters.maxRating}
          onMin={(v) => set("minRating", v)}
          onMax={(v) => set("maxRating", v)}
          step={0.5}
          limit={5}
        />
      </FilterGroup>

      <FilterGroup label="Genres" aside={selectedGenres.length ? `${selectedGenres.length}` : undefined}>
        <div className="flex flex-wrap gap-2">
          {genres.map((genre) => {
            const on = selectedGenres.includes(genre.id);
            return (
              <button
                key={genre.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggleGenre(genre.id)}
                className={`chip ${on ? "border-ink bg-ink text-paper" : "bg-sheet hover:border-ink/40"}`}
              >
                {on && <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
                {genre.name}
              </button>
            );
          })}
          {genres.length === 0 && <p className="text-sm text-muted">No genres yet</p>}
        </div>
      </FilterGroup>

      {activeCount > 0 && (
        <button
          type="button"
          onClick={clearAll}
          className="text-sm font-semibold underline decoration-seal decoration-2 underline-offset-4"
        >
          Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <Container className="pt-8 sm:pt-12">
      <PageHeader eyebrow="Filter the whole catalogue" title="Search" />

      <div className="mt-6 flex gap-2">
        <SearchInput
          value={filters.title}
          onChange={(v) => set("title", v)}
          placeholder="Title"
          className="flex-1 lg:max-w-xl"
          aria-label="Search by title"
        />
        <Button
          variant="outline"
          size="lg"
          className="lg:hidden"
          onClick={() => setPanelOpen(true)}
          icon={<SlidersHorizontal className="h-4 w-4" />}
          aria-label="Open filters"
        >
          {activeCount > 0 ? activeCount : null}
        </Button>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24">{panel}</div>
        </aside>

        <section className="min-w-0">
          <p className="mb-5 font-mono text-xs text-muted" aria-live="polite">
            {loading ? "Searching" : `${results.length} ${results.length === 1 ? "result" : "results"}`}
          </p>
          {loading && results.length === 0 ? (
            <ShelfSkeleton count={8} />
          ) : results.length === 0 ? (
            <EmptyState
              title="Nothing matches"
              body="Loosen a filter or two. Genres match any of the ones you pick."
              action={
                activeCount > 0 || filters.title ? (
                  <Button variant="outline" size="sm" onClick={clearAll}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <div
                className={`grid grid-cols-2 gap-x-4 gap-y-9 transition-opacity sm:grid-cols-3 xl:grid-cols-4 ${
                  loading ? "opacity-50" : ""
                }`}
              >
                {visible.map((webtoon, i) => (
                  <WebtoonCard
                    key={webtoon.id}
                    index={i % 20}
                    id={webtoon.id}
                    title={webtoon.title}
                    authors={webtoon.authors}
                    rating={webtoon.rating}
                    totalChapters={webtoon.releases?.[0]?.total_chapter ?? 0}
                    onClick={openWebtoon}
                    showFavorite={isLogged}
                    isAddable={webtoon.addable !== false}
                    releaseId={webtoon.releases?.[0]?.id}
                    isFavoriteLoading={pending === webtoon.releases?.[0]?.id}
                    onFavoriteClick={(id, releaseId) => add(id, releaseId, webtoon.releases?.[0]?.total_chapter ?? 0)}
                  />
                ))}
              </div>
              {hasMore && <div ref={sentinel} className="h-px" />}
            </>
          )}
        </section>
      </div>

      {panelOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setPanelOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] animate-rise overflow-y-auto rounded-t-[1.25rem] bg-paper px-5 pb-8 pt-3">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink/15" />
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Filters</h2>
              <button
                onClick={() => setPanelOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-full hover:bg-ink/[0.06]"
                aria-label="Close filters"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {panel}
            <Button size="lg" className="mt-8 w-full" onClick={() => setPanelOpen(false)}>
              Show {results.length} {results.length === 1 ? "result" : "results"}
            </Button>
          </div>
        </div>
      )}
    </Container>
  );
}

function FilterGroup({ label, aside, children }: { label: string; aside?: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2.5 flex items-baseline justify-between text-[13px] font-semibold">
        {label}
        {aside && <span className="font-mono text-xs font-normal text-muted">{aside}</span>}
      </p>
      {children}
    </div>
  );
}

function Range({
  min,
  max,
  onMin,
  onMax,
  step = 1,
  limit,
}: {
  min: string;
  max: string;
  onMin: (v: string) => void;
  onMax: (v: string) => void;
  step?: number;
  limit?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        inputMode="decimal"
        min={0}
        max={limit}
        step={step}
        value={min}
        onChange={(e) => onMin(e.target.value)}
        placeholder="Min"
        aria-label="Minimum"
        className="field font-mono"
      />
      <span className="text-muted">to</span>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        max={limit}
        step={step}
        value={max}
        onChange={(e) => onMax(e.target.value)}
        placeholder="Max"
        aria-label="Maximum"
        className="field font-mono"
      />
    </div>
  );
}
