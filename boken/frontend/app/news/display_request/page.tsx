"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, X } from "lucide-react";
import Cover from "@/components/Cover";
import StatusPill from "@/components/StatusPill";
import { Button, Container, EmptyState } from "@/components/ui";
import { useFeedback } from "@/components/feedback";
import { useAuth } from "@/utils/userAuth";
import { api, ApiError } from "@/lib/api";
import { getCookie } from "@/lib/cookies";
import { LANGUAGES, formatDate } from "@/lib/format";
import type { Webtoon } from "@/lib/types";

export default function ReviewRequest() {
  const [webtoon, setWebtoon] = useState<Webtoon>();
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { isLogged, mounted } = useAuth();
  const { confirm, toast } = useFeedback();

  useEffect(() => {
    if (!mounted) return;
    if (!isLogged) {
      router.replace("/login");
      return;
    }
    const id = getCookie("webtoon");
    if (!id) {
      router.replace("/news");
      return;
    }
    api<Webtoon>(`/api/webtoon/${id}/`)
      .then(setWebtoon)
      .catch((err) => {
        console.error("Failed to fetch request:", err);
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) router.replace("/news");
        else setFailed(true);
      });
  }, [mounted, isLogged, router]);

  const decide = async (accept: boolean) => {
    if (!webtoon) return;
    const ok = await confirm(
      accept
        ? {
            title: "Publish this entry?",
            body: "It becomes visible to everyone on Boken.",
            confirmLabel: "Publish",
          }
        : {
            title: "Decline this entry?",
            body: "It goes back to private. The reader keeps it in their library.",
            confirmLabel: "Decline",
            danger: true,
          }
    );
    if (!ok) return;

    setBusy(true);
    try {
      await api(`/api/webtoon/${webtoon.id}/`, {
        method: "PATCH",
        body: accept ? { waiting_review: false, is_public: true } : { waiting_review: false },
      });
      toast(accept ? "Published" : "Declined", accept ? "success" : "default");
      router.push("/news");
    } catch (err) {
      console.error("Review decision failed:", err);
      toast("That did not go through, try again", "error");
      setBusy(false);
    }
  };

  if (failed) {
    return (
      <Container className="pt-10">
        <EmptyState
          title="This request could not be loaded"
          action={
            <Link href="/news" className="inline-flex h-10 items-center rounded-full bg-ink px-4 text-sm font-semibold text-paper">
              Back to requests
            </Link>
          }
        />
      </Container>
    );
  }

  if (!webtoon) {
    return (
      <Container className="pt-14">
        <div className="h-80 animate-pulse rounded-panel bg-ink/[0.06]" />
      </Container>
    );
  }

  const release = webtoon.releases?.[0];
  const language = LANGUAGES.find((l) => l.value === release?.language)?.label ?? release?.language;

  return (
    <Container className="max-w-4xl pt-6 sm:pt-8">
      <Link href="/news" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Requests
      </Link>

      <div className="grid gap-8 sm:grid-cols-[180px_1fr]">
        <Cover title={webtoon.title} chapters={release?.total_chapter} className="w-40 sm:w-full" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={webtoon.status} />
            {webtoon.add_by?.username && <span className="eyebrow">Submitted by {webtoon.add_by.username}</span>}
          </div>
          <h1 className="display mt-4 break-words text-5xl sm:text-6xl">{webtoon.title}</h1>
          {release?.alt_title && <p className="mt-2 text-muted">{release.alt_title}</p>}
          <p className="mt-1 text-[15px] font-semibold">{webtoon.authors}</p>

          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-y border-line py-5 text-sm sm:grid-cols-4">
            <Item label="Chapters">{release?.total_chapter ?? 0}</Item>
            <Item label="Language">{language || "Unknown"}</Item>
            <Item label="First release">{formatDate(webtoon.release_date) || "Unknown"}</Item>
            <Item label="Genres">{webtoon.genres?.length ?? 0}</Item>
          </dl>

          {webtoon.genres && webtoon.genres.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-2">
              {webtoon.genres.map((g) => (
                <li key={g.id} className="chip">
                  {g.name}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-8">
            <h2 className="eyebrow mb-3">Synopsis</h2>
            {release?.description ? (
              <p className="max-w-[65ch] whitespace-pre-line leading-[1.7]">{release.description}</p>
            ) : (
              <p className="text-muted">No synopsis provided.</p>
            )}
          </div>

          <div className="mt-10 flex flex-wrap gap-3 border-t border-line pt-6">
            <Button size="lg" disabled={busy} onClick={() => decide(true)} icon={<Check className="h-4 w-4" strokeWidth={2.5} />}>
              Publish
            </Button>
            <Button
              size="lg"
              variant="outline"
              disabled={busy}
              onClick={() => decide(false)}
              className="text-seal"
              icon={<X className="h-4 w-4" strokeWidth={2.5} />}
            >
              Decline
            </Button>
          </div>
        </div>
      </div>
    </Container>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1 font-mono">{children}</dd>
    </div>
  );
}
