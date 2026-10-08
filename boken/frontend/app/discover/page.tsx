"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import WebtoonCard from "@/components/Webtoon_card";
import Cover from "@/components/Cover";
import { RatingBadge } from "@/components/Rating";
import { Container, EmptyState, SearchInput, Segmented, ShelfSkeleton } from "@/components/ui";
import { useAuth } from "@/utils/userAuth";
import { api } from "@/lib/api";
import { timeAgo, webtoonStatusLabel } from "@/lib/format";
import { useAddToLibrary, useOpenWebtoon, usePaged } from "@/lib/hooks";
import type { Webtoon } from "@/lib/types";

type Sort = "latest" | "rating" | "title";

const SORTS: { value: Sort; label: string }[] = [
  { value: "latest", label: "Latest" },
  { value: "rating", label: "Top rated" },
  { value: "title", label: "Title" },
];

export default function HomePage() {
  const [webtoons, setWebtoons] = useState<Webtoon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("latest");
  const { isLogged, token, mounted } = useAuth();
  const openWebtoon = useOpenWebtoon();

  const markAdded = useCallback((id: string) => {
    setWebtoons((prev) => prev.map((w) => (w.id === id ? { ...w, addable: false } : w)));
  }, []);
  const { add, pending } = useAddToLibrary(markAdded);

  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    setLoading(true);
    api<Webtoon[]>(isLogged ? "/api/webtoon/logged_user/" : "/api/webtoon/", { auth: isLogged })
      .then((data) => {
        if (cancelled) return;
        setWebtoons(data);
        setError(null);
      })
      .catch((err) => {
        console.error("Failed to fetch webtoons:", err);
        if (!cancelled) setError("We could not reach the catalogue. Check that the API is running and try again.");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [isLogged, token, mounted]);

  const sorted = useMemo(() => {
    const list = [...webtoons];
    if (sort === "latest") {
      list.sort((a, b) => new Date(b.update_at ?? 0).getTime() - new Date(a.update_at ?? 0).getTime());
    } else if (sort === "rating") {
      list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else {
      list.sort((a, b) => a.title.localeCompare(b.title));
    }
    return list;
  }, [webtoons, sort]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return sorted;
    return sorted.filter((w) => w.title.toLowerCase().includes(q) || w.authors.toLowerCase().includes(q));
  }, [sorted, query]);

  const spotlight = !query && sort === "latest" ? sorted[0] : undefined;
  const { visible, sentinel, hasMore } = usePaged(filtered);

  return (
    <Container className="pt-8 sm:pt-12">
      <section className="grid gap-8 border-b border-line pb-8 lg:grid-cols-[1fr_minmax(0,380px)] lg:items-end">
        <div>
          <p className="eyebrow mb-3">Manhwa, manhua and webtoons</p>
          <h1 className="display text-[3.4rem] sm:text-[5.5rem]">
            Discover
            <span className="ml-3 align-top font-mono text-sm font-normal normal-case tracking-normal text-muted sm:text-base">
              {loading ? "" : String(webtoons.length).padStart(3, "0")}
            </span>
          </h1>
        </div>
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Title or author"
          aria-label="Search webtoons by title or author"
        />
      </section>

      {mounted && !isLogged && (
        <div className="mt-6 flex flex-col gap-3 rounded-panel bg-ink px-5 py-4 text-paper sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">
            <span className="font-semibold">Keep your place in every series.</span>{" "}
            <span className="text-paper/70">Create a free account to save chapters, notes and ratings.</span>
          </p>
          <Link
            href="/login"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 self-start rounded-full bg-paper px-4 text-sm font-semibold text-ink sm:self-auto"
          >
            Get started <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {spotlight && !loading && (
        <Spotlight
          webtoon={spotlight}
          onOpen={openWebtoon}
        />
      )}

      <section className="mt-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">
            {query ? (
              <>
                Results <span className="font-mono text-sm font-normal text-muted">{filtered.length}</span>
              </>
            ) : (
              "All series"
            )}
          </h2>
          <Segmented label="Sort by" value={sort} options={SORTS} onChange={setSort} />
        </div>

        {loading ? (
          <ShelfSkeleton />
        ) : error ? (
          <EmptyState title="Nothing loaded" body={error} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={query ? `No match for "${query}"` : "The shelf is empty"}
            body={
              query
                ? "Try another spelling, or use the advanced search to filter by genre and status."
                : "Be the first to add a series."
            }
            action={
              <Link
                href={query ? "/advanced_search" : "/library/add_webtoon"}
                className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line bg-sheet px-4 text-sm font-semibold hover:border-ink/40"
              >
                {query ? "Advanced search" : "Add a webtoon"}
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
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
    </Container>
  );
}

function Spotlight({ webtoon, onOpen }: { webtoon: Webtoon; onOpen: (id: string) => void }) {
  const release = webtoon.releases?.[0];
  return (
    <section className="mt-8">
      <button
        type="button"
        onClick={() => onOpen(webtoon.id)}
        className="group grid w-full grid-cols-[96px_1fr] gap-4 overflow-hidden rounded-panel border border-line bg-sheet p-4 text-left transition-colors hover:border-ink/30 sm:grid-cols-[180px_1fr] sm:gap-8 sm:p-5"
      >
        <Cover title={webtoon.title} className="w-full" />
        <div className="flex min-w-0 flex-col sm:py-1">
          <p className="eyebrow">
            <span className="text-seal">Latest update</span>
            {webtoon.update_at && <span className="hidden sm:inline">, {timeAgo(webtoon.update_at)}</span>}
          </p>
          <h2 className="display mt-2 break-words text-2xl sm:mt-3 sm:text-5xl">{webtoon.title}</h2>
          <p className="mt-1 truncate text-sm text-muted sm:mt-2">{webtoon.authors}</p>
          {release?.description && (
            <p className="mt-4 hidden max-w-2xl text-[15px] leading-relaxed sm:line-clamp-3">{release.description}</p>
          )}
          <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-3 text-sm sm:gap-x-5 sm:pt-5">
            <RatingBadge value={webtoon.rating} className="text-sm" />
            <span className="font-mono text-xs text-muted">{release?.total_chapter ?? 0} ch</span>
            <span className="hidden font-mono text-xs text-muted sm:inline">{webtoonStatusLabel(webtoon.status)}</span>
            {webtoon.genres?.slice(0, 3).map((g) => (
              <span key={g.id} className="chip hidden py-0.5 text-xs sm:inline-flex">
                {g.name}
              </span>
            ))}
            <span className="ml-auto hidden items-center gap-1 font-semibold sm:inline-flex">
              Open <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </div>
      </button>
    </section>
  );
}
