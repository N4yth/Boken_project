"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import Cover from "@/components/Cover";
import StatusPill from "@/components/StatusPill";
import { Stars } from "@/components/Rating";
import { Button, Container, EmptyState } from "@/components/ui";
import { useAuth } from "@/utils/userAuth";
import { api, ApiError } from "@/lib/api";
import { getCookie } from "@/lib/cookies";
import { LANGUAGES, formatDate, timeAgo } from "@/lib/format";
import { useAddToLibrary } from "@/lib/hooks";
import type { Webtoon } from "@/lib/types";

export default function DisplayWebtoon() {
  const [webtoon, setWebtoon] = useState<Webtoon>();
  const [inLibrary, setInLibrary] = useState(false);
  const [failed, setFailed] = useState(false);
  const router = useRouter();
  const { isLogged, token, mounted } = useAuth();
  const { add, pending } = useAddToLibrary(() => setInLibrary(true));

  useEffect(() => {
    if (!mounted) return;
    const id = getCookie("webtoon");
    if (!id) {
      router.replace("/discover");
      return;
    }
    api<Webtoon>(`/api/webtoon/${id}/`)
      .then((data) => {
        setWebtoon(data);
        // On this endpoint the backend sends addable=true when the series is already in the library
        setInLibrary(data.addable === true);
      })
      .catch((err) => {
        console.error("Failed to fetch webtoon:", err);
        if (err instanceof ApiError && err.status === 403) router.replace("/discover");
        else setFailed(true);
      });
  }, [mounted, isLogged, token, router]);

  if (failed) {
    return (
      <Container className="pt-10">
        <EmptyState
          title="This series could not be loaded"
          body="It may be private, or the link has expired. Head back to the catalogue and open it again."
          action={
            <Link href="/discover" className="inline-flex h-10 items-center rounded-full bg-ink px-4 text-sm font-semibold text-paper">
              Back to Discover
            </Link>
          }
        />
      </Container>
    );
  }

  if (!webtoon) return <DetailSkeleton />;

  const release = webtoon.releases?.[0];
  const chapters = release?.total_chapter ?? 0;

  return (
    <Container className="pt-6 sm:pt-8">
      <button
        onClick={() => router.back()}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="grid gap-8 md:grid-cols-[minmax(0,300px)_1fr] md:gap-12">
        <div className="md:sticky md:top-24 md:self-start">
          <Cover title={webtoon.title} chapters={chapters} size="lg" className="mx-auto w-56 sm:w-64 md:w-full" />
        </div>

        <article className="min-w-0 animate-rise">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={webtoon.status} />
            {webtoon.update_at && <span className="eyebrow">Updated {timeAgo(webtoon.update_at)}</span>}
          </div>

          <h1 className="display mt-4 break-words text-5xl sm:text-7xl">{webtoon.title}</h1>
          {release?.alt_title && <p className="mt-3 text-lg text-muted">{release.alt_title}</p>}
          <p className="mt-2 text-[15px]">
            <span className="text-muted">by</span> <span className="font-semibold">{webtoon.authors}</span>
          </p>

          <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-panel border border-line bg-line sm:grid-cols-4">
            <Stat label="Community">
              <span className="flex items-center gap-2">
                {Number(webtoon.rating ?? 0).toFixed(1)}
                <Stars value={webtoon.rating ?? 0} size="sm" label="Community rating" />
              </span>
            </Stat>
            <Stat label="Chapters">{chapters}</Stat>
            <Stat label="First release">{formatDate(webtoon.release_date) || "Unknown"}</Stat>
            <Stat label="Editions">{webtoon.releases?.length ?? 0}</Stat>
          </dl>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {inLibrary ? (
              <>
                <span className="inline-flex animate-stamp items-center rounded-md border-2 border-jade px-3 py-1 font-display text-sm font-extrabold uppercase tracking-wide text-jade">
                  In your library
                </span>
                <Link
                  href="/library/update_webtoon"
                  className="inline-flex h-11 items-center gap-1.5 rounded-full border border-line bg-sheet px-5 text-sm font-semibold hover:border-ink/40"
                >
                  Update progress <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            ) : (
              <Button
                size="lg"
                icon={<Plus className="h-4 w-4" strokeWidth={2.5} />}
                disabled={!release || pending !== null}
                onClick={() => release && add(webtoon.id, release.id, chapters)}
              >
                {!release ? "No edition to follow yet" : pending ? "Adding" : isLogged ? "Add to library" : "Sign in to follow"}
              </Button>
            )}
          </div>

          {webtoon.genres && webtoon.genres.length > 0 && (
            <ul className="mt-8 flex flex-wrap gap-2">
              {webtoon.genres.map((genre) => (
                <li key={genre.id} className="chip">
                  {genre.name}
                </li>
              ))}
            </ul>
          )}

          <section className="mt-10 border-t border-line pt-8">
            <h2 className="eyebrow mb-4">Synopsis</h2>
            {release?.description ? (
              <p className="max-w-[65ch] whitespace-pre-line text-[17px] leading-[1.7]">{release.description}</p>
            ) : (
              <p className="text-muted">No synopsis yet for this edition.</p>
            )}
          </section>

          {webtoon.releases && webtoon.releases.length > 1 && (
            <section className="mt-10 border-t border-line pt-8">
              <h2 className="eyebrow mb-4">Editions</h2>
              <ul className="divide-y divide-line rounded-panel border border-line bg-sheet">
                {webtoon.releases.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                    <span className="font-medium">
                      {LANGUAGES.find((l) => l.value === r.language)?.label ?? r.language ?? "Unknown"}
                    </span>
                    <span className="font-mono text-xs text-muted">{r.total_chapter} ch</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>
      </div>
    </Container>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-sheet px-4 py-3.5">
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1.5 font-mono text-lg tabular-nums">{children}</dd>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <Container className="pt-14">
      <div className="grid animate-pulse gap-8 md:grid-cols-[minmax(0,300px)_1fr] md:gap-12">
        <div className="mx-auto aspect-[3/4] w-56 rounded-[10px] bg-ink/[0.07] sm:w-64 md:w-full" />
        <div>
          <div className="h-6 w-28 rounded-full bg-ink/[0.07]" />
          <div className="mt-5 h-14 w-4/5 rounded bg-ink/[0.07]" />
          <div className="mt-3 h-4 w-40 rounded bg-ink/[0.05]" />
          <div className="mt-8 h-20 rounded-panel bg-ink/[0.05]" />
        </div>
      </div>
    </Container>
  );
}
