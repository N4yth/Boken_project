"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import Cover from "@/components/Cover";
import { Container, EmptyState, PageHeader } from "@/components/ui";
import { useAuth } from "@/utils/userAuth";
import { api, ApiError } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { useOpenWebtoon } from "@/lib/hooks";
import type { Webtoon } from "@/lib/types";

export default function Requests() {
  const [requests, setRequests] = useState<Webtoon[]>([]);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<"ok" | "forbidden" | "error">("ok");
  const router = useRouter();
  const { isLogged, mounted } = useAuth();
  const openRequest = useOpenWebtoon("/news/display_request");

  useEffect(() => {
    if (!mounted) return;
    if (!isLogged) {
      router.replace("/login");
      return;
    }
    api<Webtoon[]>("/api/webtoon/check/")
      .then((data) => {
        setRequests(data);
        setState("ok");
      })
      .catch((err) => {
        console.error("Failed to fetch requests:", err);
        setState(err instanceof ApiError && err.status === 403 ? "forbidden" : "error");
      })
      .finally(() => setLoading(false));
  }, [mounted, isLogged, router]);

  return (
    <Container className="max-w-4xl pt-8 sm:pt-12">
      <PageHeader
        eyebrow={loading || state !== "ok" ? "Review queue" : `${requests.length} waiting`}
        title="Requests"
      />

      <div className="mt-8">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-panel bg-ink/[0.06]" />
            ))}
          </div>
        ) : state === "forbidden" ? (
          <EmptyState
            title="Admins only"
            body="Submissions from readers are reviewed here before they go public. Your own entries show their review status in your library."
          />
        ) : state === "error" ? (
          <EmptyState title="Nothing loaded" body="The queue could not be reached. Try again in a moment." />
        ) : requests.length === 0 ? (
          <EmptyState title="Inbox zero" body="No submissions waiting for review." />
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-panel border border-line bg-sheet">
            {requests.map((webtoon, i) => (
              <li key={webtoon.id} className="animate-rise" style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}>
                <button
                  onClick={() => openRequest(webtoon.id)}
                  className="group flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-paper/60"
                >
                  <Cover title={webtoon.title} size="sm" className="w-12 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{webtoon.title}</p>
                    <p className="truncate text-sm text-muted">{webtoon.authors}</p>
                    <p className="mt-1 font-mono text-xs text-muted">
                      {webtoon.add_by?.username ? `from ${webtoon.add_by.username}` : "from a reader"}
                      {webtoon.update_at ? `, ${timeAgo(webtoon.update_at)}` : ""}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Container>
  );
}
