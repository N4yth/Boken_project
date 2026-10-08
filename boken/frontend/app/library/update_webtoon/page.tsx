"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Minus, Plus, Send, Trash2 } from "lucide-react";
import Cover from "@/components/Cover";
import StatusPill from "@/components/StatusPill";
import { Stars } from "@/components/Rating";
import { Button, Container, EmptyState, Segmented } from "@/components/ui";
import { useFeedback } from "@/components/feedback";
import { useAuth } from "@/utils/userAuth";
import { api, ApiError } from "@/lib/api";
import { getCookie } from "@/lib/cookies";
import { READING_STATUS, timeAgo } from "@/lib/format";
import type { ReadingStatus, UserRelease, Webtoon } from "@/lib/types";

type Draft = Pick<UserRelease, "reading_status" | "chapter_read" | "personal_total_chapter" | "rating" | "note">;

function toDraft(entry: UserRelease): Draft {
  return {
    reading_status: entry.reading_status,
    chapter_read: entry.chapter_read ?? 0,
    personal_total_chapter: entry.personal_total_chapter ?? 0,
    rating: entry.rating ?? 0,
    note: entry.note ?? "",
  };
}

export default function UpdateWebtoon() {
  const [webtoon, setWebtoon] = useState<Webtoon>();
  const [entry, setEntry] = useState<UserRelease>();
  const [draft, setDraft] = useState<Draft>();
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const router = useRouter();
  const { isLogged, mounted } = useAuth();
  const { toast, confirm } = useFeedback();

  useEffect(() => {
    if (!mounted) return;
    if (!isLogged) {
      router.replace("/login");
      return;
    }
    const id = getCookie("webtoon");
    if (!id) {
      router.replace("/library");
      return;
    }
    Promise.all([api<Webtoon>(`/api/webtoon/${id}/`), api<UserRelease>(`/api/usereleases/with_webtoon/${id}/`)])
      .then(([w, e]) => {
        setWebtoon(w);
        setEntry(e);
        setDraft(toDraft(e));
      })
      .catch((err) => {
        console.error("Failed to load library entry:", err);
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) router.replace("/library");
        else setFailed(true);
      });
  }, [mounted, isLogged, router]);

  const dirty = useMemo(() => {
    if (!entry || !draft) return false;
    return JSON.stringify(toDraft(entry)) !== JSON.stringify(draft);
  }, [entry, draft]);

  const update = useCallback((patch: Partial<Draft>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const setRead = (value: number) => {
    if (!draft) return;
    const read = Math.max(0, Math.min(value, draft.personal_total_chapter));
    const patch: Partial<Draft> = { chapter_read: read };
    if (read > 0 && draft.reading_status === "to read") patch.reading_status = "reading";
    update(patch);
  };

  const setTotal = (value: number) => {
    if (!draft) return;
    const total = Math.max(0, value);
    update({ personal_total_chapter: total, chapter_read: Math.min(draft.chapter_read, total) });
  };

  const setStatus = (status: ReadingStatus) => {
    if (!draft) return;
    const patch: Partial<Draft> = { reading_status: status };
    if (status === "to read") patch.chapter_read = 0;
    if (status === "finish") patch.chapter_read = draft.personal_total_chapter;
    update(patch);
  };

  const handleSave = async () => {
    if (!entry || !draft) return;
    if (draft.chapter_read > draft.personal_total_chapter) {
      toast("Chapters read cannot be higher than the total", "error");
      return;
    }
    setSaving(true);
    try {
      const saved = await api<UserRelease>(`/api/usereleases/${entry.id}/`, { method: "PATCH", body: draft });
      const next = { ...entry, ...draft, ...(saved ?? {}) };
      setEntry(next);
      setDraft(toDraft(next));
      toast("Progress saved", "success");
    } catch (err) {
      console.error("Error saving changes:", err);
      toast("Saving failed, try again", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!entry) return;
    const ok = await confirm({
      title: "Remove from your library?",
      body: "Your progress, rating and note for this series will be deleted.",
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/api/usereleases/${entry.id}/`, { method: "DELETE" });
      toast("Removed from your library");
      router.push("/library");
    } catch (err) {
      console.error("Failed to remove entry:", err);
      toast("Could not remove it, reload the page and try again", "error");
    }
  };

  const handlePublishRequest = async () => {
    if (!webtoon) return;
    const ok = await confirm({
      title: "Submit for review?",
      body: "An admin will check the entry. Once approved, everyone on Boken can find it.",
      confirmLabel: "Submit",
    });
    if (!ok) return;
    try {
      await api(`/api/webtoon/${webtoon.id}/`, { method: "PATCH", body: { waiting_review: true } });
      setWebtoon({ ...webtoon, waiting_review: true });
      toast("Sent for review", "success");
    } catch (err) {
      console.error("Failed to send review request:", err);
      toast("The request could not be sent", "error");
    }
  };

  if (failed) {
    return (
      <Container className="pt-10">
        <EmptyState
          title="This entry could not be loaded"
          body="Go back to your library and open it again."
          action={
            <Link href="/library" className="inline-flex h-10 items-center rounded-full bg-ink px-4 text-sm font-semibold text-paper">
              Back to library
            </Link>
          }
        />
      </Container>
    );
  }

  if (!webtoon || !draft || !entry) {
    return (
      <Container className="pt-14">
        <div className="animate-pulse space-y-6">
          <div className="h-28 rounded-panel bg-ink/[0.06]" />
          <div className="h-64 rounded-panel bg-ink/[0.05]" />
        </div>
      </Container>
    );
  }

  const release = webtoon.releases?.[0];
  const total = draft.personal_total_chapter;
  const progress = total > 0 ? Math.round((draft.chapter_read / total) * 100) : 0;

  return (
    <Container className="max-w-4xl pt-6 sm:pt-8">
      <Link href="/library" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Library
      </Link>

      <header className="flex gap-4 sm:gap-6">
        <Cover title={webtoon.title} size="sm" className="w-20 shrink-0 sm:w-28" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={webtoon.status} />
            <Visibility webtoon={webtoon} />
          </div>
          <h1 className="display mt-3 break-words text-4xl sm:text-6xl">{webtoon.title}</h1>
          <p className="mt-1.5 text-sm text-muted">{webtoon.authors}</p>
        </div>
      </header>

      <div className="mt-6 flex flex-wrap gap-2">
        {webtoon.is_public && (
          <Link
            href="/display_webtoon"
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-sheet px-3.5 text-[13px] font-semibold hover:border-ink/40"
          >
            Public page <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        )}
        {!webtoon.is_public && !webtoon.waiting_review && (
          <Button size="sm" variant="outline" icon={<Send className="h-3.5 w-3.5" />} onClick={handlePublishRequest}>
            Submit for review
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="text-seal hover:bg-seal/10"
          icon={<Trash2 className="h-3.5 w-3.5" />}
          onClick={handleRemove}
        >
          Remove
        </Button>
      </div>

      <section className="mt-8 overflow-hidden rounded-panel border border-line bg-sheet">
        <div className="p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Chapters read</p>
              <p className="mt-2 font-mono text-5xl tabular-nums tracking-tight sm:text-6xl">
                {String(draft.chapter_read).padStart(3, "0")}
                <span className="text-2xl text-muted sm:text-3xl"> / {String(total).padStart(3, "0")}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRead(draft.chapter_read - 1)}
                disabled={draft.chapter_read <= 0}
                className="grid h-12 w-12 place-items-center rounded-full border border-line transition-colors hover:border-ink/40 disabled:opacity-40"
                aria-label="One chapter less"
              >
                <Minus className="h-5 w-5" />
              </button>
              <button
                onClick={() => setRead(draft.chapter_read + 1)}
                disabled={draft.chapter_read >= total}
                className="grid h-12 w-12 place-items-center rounded-full bg-ink text-paper transition-opacity hover:opacity-90 disabled:opacity-40"
                aria-label="One chapter more"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </div>

          <ProgressStrip value={draft.chapter_read} total={total} />
          <p className="mt-2 flex justify-between font-mono text-xs text-muted">
            <span>{progress}%</span>
            <span>{total - draft.chapter_read > 0 ? `${total - draft.chapter_read} to go` : total > 0 ? "All caught up" : ""}</span>
          </p>
        </div>

        <div className="grid gap-6 border-t border-line p-5 sm:grid-cols-2 sm:p-7">
          <div>
            <p className="mb-2 text-[13px] font-semibold">Status</p>
            <Segmented
              label="Reading status"
              value={draft.reading_status as ReadingStatus}
              options={READING_STATUS}
              onChange={setStatus}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-2 block text-[13px] font-semibold">Read</span>
              <input
                type="number"
                min={0}
                max={total}
                value={draft.chapter_read}
                onChange={(e) => setRead(parseInt(e.target.value, 10) || 0)}
                className="field font-mono"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-[13px] font-semibold">Out so far</span>
              <input
                type="number"
                min={0}
                value={total}
                onChange={(e) => setTotal(parseInt(e.target.value, 10) || 0)}
                className="field font-mono"
              />
            </label>
          </div>
          <div>
            <p className="mb-2 text-[13px] font-semibold">Your rating</p>
            <div className="flex items-center gap-3">
              <Stars value={draft.rating} onChange={(rating) => update({ rating })} label="Your rating" />
              <span className="font-mono text-sm text-muted">{draft.rating.toFixed(1)}</span>
            </div>
            <p className="mt-2 text-xs text-muted">Community: {Number(webtoon.rating ?? 0).toFixed(1)}</p>
          </div>
          <label className="block sm:col-span-2">
            <span className="mb-2 block text-[13px] font-semibold">Note</span>
            <textarea
              value={draft.note}
              onChange={(e) => update({ note: e.target.value })}
              rows={4}
              placeholder="Where you stopped, what you thought, who you would recommend it to"
              className="field resize-y leading-relaxed"
            />
          </label>
        </div>

        {entry.update_at && (
          <p className="border-t border-line px-5 py-3 font-mono text-xs text-muted sm:px-7">
            Last saved {timeAgo(entry.update_at)}
          </p>
        )}
      </section>

      {(release?.alt_title || release?.description) && (
        <section className="mt-10">
          <h2 className="eyebrow mb-4">About</h2>
          {release.alt_title && <p className="mb-2 text-muted">Also known as {release.alt_title}</p>}
          {release.description && (
            <p className="max-w-[65ch] whitespace-pre-line text-[16px] leading-[1.7]">{release.description}</p>
          )}
        </section>
      )}

      {dirty && (
        <div className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] z-50 px-4 md:bottom-6">
          <div className="mx-auto flex max-w-md animate-rise items-center justify-between gap-3 rounded-full bg-ink py-2 pl-5 pr-2 text-paper shadow-2xl">
            <span className="text-sm font-medium">Unsaved changes</span>
            <div className="flex gap-1.5">
              <button
                onClick={() => setDraft(toDraft(entry))}
                className="h-9 rounded-full px-4 text-sm font-semibold text-paper/80 hover:text-paper"
              >
                Discard
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="h-9 rounded-full bg-paper px-4 text-sm font-semibold text-ink disabled:opacity-60"
              >
                {saving ? "Saving" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
}

// One cell per chapter when it fits, otherwise a continuous bar
function ProgressStrip({ value, total }: { value: number; total: number }) {
  if (total > 0 && total <= 60) {
    return (
      <div className="mt-6 flex gap-[3px]" aria-hidden="true">
        {Array.from({ length: total }).map((_, i) => (
          <span key={i} className={`h-3 flex-1 rounded-[2px] ${i < value ? "bg-seal" : "bg-ink/10"}`} />
        ))}
      </div>
    );
  }
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="mt-6 h-3 overflow-hidden rounded-full bg-ink/10" aria-hidden="true">
      <div className="h-full rounded-full bg-seal transition-[width] duration-300" style={{ width: `${pct}%` }} />
    </div>
  );
}

function Visibility({ webtoon }: { webtoon: Webtoon }) {
  if (webtoon.is_public) return <span className="eyebrow">Public</span>;
  if (webtoon.waiting_review)
    return (
      <span className="inline-flex -rotate-3 items-center rounded border-2 border-ochre px-2 py-0.5 font-display text-[11px] font-extrabold uppercase tracking-wider text-ochre">
        Pending review
      </span>
    );
  return <span className="eyebrow">Private</span>;
}
