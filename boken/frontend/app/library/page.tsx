"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import WebtoonCard from "@/components/Webtoon_card";
import { Container, EmptyState, PageHeader, SearchInput, Segmented, ShelfSkeleton } from "@/components/ui";
import { useAuth } from "@/utils/userAuth";
import { api, ApiError } from "@/lib/api";
import { useOpenWebtoon, usePaged } from "@/lib/hooks";
import type { LibraryWebtoon } from "@/lib/types";

type View = "mine" | "community";

export default function Library() {
  const [webtoons, setWebtoons] = useState<LibraryWebtoon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>("mine");
  const router = useRouter();
  const { isLogged, mounted } = useAuth();
  const openEntry = useOpenWebtoon("/library/update_webtoon");

  useEffect(() => {
    if (!mounted) return;
    if (!isLogged) {
      router.replace("/login");
      return;
    }
    api<LibraryWebtoon[]>("/api/webtoon/get_library/")
      .then((data) => {
        setWebtoons(data);
        setError(null);
      })
      .catch((err) => {
        console.error("Failed to fetch library:", err);
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) router.replace("/login");
        else setError("Your library could not be loaded. Try again in a moment.");
      })
      .finally(() => setLoading(false));
  }, [mounted, isLogged, router]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return webtoons;
    return webtoons.filter((w) => w.title.toLowerCase().includes(q) || w.authors.toLowerCase().includes(q));
  }, [webtoons, query]);

  const { visible, sentinel, hasMore } = usePaged(filtered);

  return (
    <Container className="pt-8 sm:pt-12">
      <PageHeader
        eyebrow={loading ? "Your shelf" : `${webtoons.length} series on your shelf`}
        title="Library"
      >
        <Link
          href="/library/add_webtoon"
          className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-paper transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} /> Add a webtoon
        </Link>
      </PageHeader>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search your library"
          className="sm:max-w-sm sm:flex-1"
          aria-label="Search your library"
        />
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted">Ratings and chapters</span>
          <Segmented
            label="Show ratings and chapters from"
            value={view}
            onChange={setView}
            options={[
              { value: "mine", label: "Mine" },
              { value: "community", label: "Community" },
            ]}
          />
        </div>
      </div>

      <div className="mt-8">
        {loading ? (
          <ShelfSkeleton />
        ) : error ? (
          <EmptyState title="Nothing loaded" body={error} />
        ) : webtoons.length === 0 ? (
          <EmptyState
            title="Your shelf is empty"
            body="Add series from Discover with the plus button, or create an entry for one that is not listed yet."
            action={
              <Link href="/discover" className="inline-flex h-10 items-center rounded-full bg-ink px-4 text-sm font-semibold text-paper">
                Browse Discover
              </Link>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState title={`No match for "${query}"`} body="Only titles and authors in your library are searched." />
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
                  rating={view === "mine" ? webtoon.UR_rating : webtoon.rating}
                  totalChapters={
                    view === "mine" ? webtoon.UR_total_chapter : webtoon.releases?.[0]?.total_chapter ?? 0
                  }
                  onClick={openEntry}
                />
              ))}
            </div>
            {hasMore && <div ref={sentinel} className="h-px" />}
          </>
        )}
      </div>
    </Container>
  );
}
