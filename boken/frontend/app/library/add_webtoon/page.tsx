"use client";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import Cover from "@/components/Cover";
import { Stars } from "@/components/Rating";
import { Button, Container, Field, Segmented } from "@/components/ui";
import { useFeedback } from "@/components/feedback";
import { useAuth } from "@/utils/userAuth";
import { api, ApiError } from "@/lib/api";
import { LANGUAGES, READING_STATUS, WEBTOON_STATUS } from "@/lib/format";
import type { Genre, ReadingStatus } from "@/lib/types";

const EMPTY = {
  title: "",
  altTitle: "",
  authors: "",
  releaseDate: "",
  status: "in progress",
  language: "eng",
  chapters: "",
  description: "",
  readingStatus: "to read" as ReadingStatus,
  chapterRead: "",
  personalTotal: "",
  rating: 0,
  note: "",
  waitingReview: false,
};

export default function AddWebtoonPage() {
  const [form, setForm] = useState(EMPTY);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { isLogged, mounted } = useAuth();
  const { toast } = useFeedback();

  useEffect(() => {
    if (mounted && !isLogged) router.replace("/login");
  }, [mounted, isLogged, router]);

  useEffect(() => {
    api<Genre[]>("/api/genre/", { auth: false })
      .then(setGenres)
      .catch((err) => console.error("Failed to fetch genres:", err));
  }, []);

  const set = <K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleGenre = (id: string) =>
    setSelectedGenres((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const chapters = parseInt(form.chapters, 10);
    if (selectedGenres.length === 0) return setError("Pick at least one genre.");
    if (Number.isNaN(chapters) || chapters < 0) return setError("Enter how many chapters are out.");

    const personalTotal = form.personalTotal ? parseInt(form.personalTotal, 10) : chapters;
    const chapterRead = form.chapterRead ? parseInt(form.chapterRead, 10) : 0;
    if (chapterRead > personalTotal) return setError("Chapters read cannot be higher than the total.");

    setSubmitting(true);
    try {
      await api("/api/webtoon/full_create/", {
        method: "POST",
        body: {
          title: form.title.trim(),
          authors: form.authors.trim(),
          genres: selectedGenres,
          release_date: form.releaseDate,
          status: form.status,
          waiting_review: form.waitingReview,
          rating: 0,
          alt_title: form.altTitle.trim(),
          description: form.description.trim(),
          language: form.language,
          total_chapter: chapters,
          chapter_read: chapterRead,
          note: form.note,
          personal_total_chapter: personalTotal,
          personal_rating: form.rating,
          reading_status: form.readingStatus,
        },
      });
      toast(form.waitingReview ? "Added and sent for review" : "Added to your library", "success");
      router.push("/library");
    } catch (err) {
      console.error("Error creating webtoon:", err);
      setError(err instanceof ApiError ? err.message : "The webtoon could not be created.");
      setSubmitting(false);
    }
  };

  return (
    <Container className="pt-6 sm:pt-8">
      <Link href="/library" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Library
      </Link>

      <div className="border-b border-line pb-5">
        <p className="eyebrow mb-2">New entry</p>
        <h1 className="display text-[2.6rem] sm:text-6xl">Add a webtoon</h1>
        <p className="mt-3 max-w-xl text-[15px] text-muted">
          Entries start private, only you can see them. Submit one for review and an admin can make it public.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 grid gap-10 lg:grid-cols-[1fr_260px]">
        <div className="min-w-0 space-y-10">
          <Section title="The series">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Title" htmlFor="title" className="sm:col-span-2">
                <input id="title" required value={form.title} onChange={(e) => set("title", e.target.value)} className="field" />
              </Field>
              <Field label="Alternative title" htmlFor="alt" hint="Original or translated title">
                <input id="alt" required value={form.altTitle} onChange={(e) => set("altTitle", e.target.value)} className="field" />
              </Field>
              <Field label="Authors" htmlFor="authors" hint="Separate names with commas">
                <input id="authors" required value={form.authors} onChange={(e) => set("authors", e.target.value)} className="field" />
              </Field>
              <Field label="First release" htmlFor="date">
                <input
                  id="date"
                  type="date"
                  required
                  value={form.releaseDate}
                  onChange={(e) => set("releaseDate", e.target.value)}
                  className="field"
                />
              </Field>
              <Field label="Chapters out" htmlFor="chapters">
                <input
                  id="chapters"
                  type="number"
                  min={0}
                  required
                  value={form.chapters}
                  onChange={(e) => set("chapters", e.target.value)}
                  className="field font-mono"
                />
              </Field>
              <Field label="Publication" htmlFor="status">
                <select id="status" value={form.status} onChange={(e) => set("status", e.target.value)} className="field">
                  {WEBTOON_STATUS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Language" htmlFor="language">
                <select id="language" value={form.language} onChange={(e) => set("language", e.target.value)} className="field">
                  {LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Synopsis" htmlFor="description" className="sm:col-span-2">
                <textarea
                  id="description"
                  rows={5}
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  className="field resize-y leading-relaxed"
                />
              </Field>
            </div>
          </Section>

          <Section title="Genres" aside={selectedGenres.length > 0 ? `${selectedGenres.length} selected` : "Pick at least one"}>
            {genres.length === 0 ? (
              <p className="text-sm text-muted">Loading genres</p>
            ) : (
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
              </div>
            )}
          </Section>

          <Section title="Your reading">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <p className="mb-2 text-[13px] font-semibold">Status</p>
                <Segmented
                  label="Reading status"
                  value={form.readingStatus}
                  options={READING_STATUS}
                  onChange={(value) => set("readingStatus", value)}
                />
              </div>
              <Field label="Chapters read" htmlFor="read">
                <input
                  id="read"
                  type="number"
                  min={0}
                  value={form.chapterRead}
                  onChange={(e) => set("chapterRead", e.target.value)}
                  placeholder="0"
                  className="field font-mono"
                />
              </Field>
              <Field label="Out in your language" htmlFor="ptotal" hint="Leave empty to use chapters out">
                <input
                  id="ptotal"
                  type="number"
                  min={0}
                  value={form.personalTotal}
                  onChange={(e) => set("personalTotal", e.target.value)}
                  placeholder={form.chapters || "0"}
                  className="field font-mono"
                />
              </Field>
              <div className="sm:col-span-2">
                <p className="mb-2 text-[13px] font-semibold">Your rating</p>
                <Stars value={form.rating} onChange={(value) => set("rating", value)} label="Your rating" />
              </div>
              <Field label="Note" htmlFor="note" className="sm:col-span-2">
                <textarea
                  id="note"
                  rows={3}
                  value={form.note}
                  onChange={(e) => set("note", e.target.value)}
                  className="field resize-y leading-relaxed"
                />
              </Field>
            </div>
          </Section>

          <label className="flex cursor-pointer items-start gap-4 rounded-panel border border-line bg-sheet p-4 transition-colors hover:border-ink/30">
            <input
              type="checkbox"
              checked={form.waitingReview}
              onChange={(e) => set("waitingReview", e.target.checked)}
              className="peer sr-only"
            />
            <span className="mt-0.5 grid h-5 w-9 shrink-0 items-center rounded-full bg-ink/15 p-0.5 transition-colors peer-checked:bg-jade peer-focus-visible:ring-2 peer-focus-visible:ring-seal">
              <span
                className={`h-4 w-4 rounded-full bg-sheet shadow transition-transform ${form.waitingReview ? "translate-x-4" : ""}`}
              />
            </span>
            <span>
              <span className="block text-sm font-semibold">Submit for review</span>
              <span className="mt-0.5 block text-sm text-muted">
                An admin checks the entry before it shows up for everyone.
              </span>
            </span>
          </label>

          {error && (
            <p role="alert" className="rounded-lg border border-seal/30 bg-seal/[0.07] px-3.5 py-2.5 text-sm text-seal">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-3 border-t border-line pt-6">
            <Button type="submit" size="lg" disabled={submitting}>
              {submitting ? "Saving" : "Add to library"}
            </Button>
            <Link
              href="/library"
              className="inline-flex h-12 items-center rounded-full px-5 text-[15px] font-semibold text-muted hover:text-ink"
            >
              Cancel
            </Link>
          </div>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <p className="eyebrow mb-3">Preview</p>
            <Cover title={form.title || "Untitled"} seed={form.title || "untitled"} chapters={parseInt(form.chapters, 10) || 0} />
            <p className="mt-3 truncate text-[15px] font-semibold">{form.title || "Untitled"}</p>
            <p className="truncate text-[13px] text-muted">{form.authors || "Author"}</p>
          </div>
        </aside>
      </form>
    </Container>
  );
}

function Section({ title, aside, children }: { title: string; aside?: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-5 flex w-full items-baseline justify-between border-b border-line pb-2">
        <span className="text-lg font-semibold">{title}</span>
        {aside && <span className="font-mono text-xs text-muted">{aside}</span>}
      </legend>
      {children}
    </fieldset>
  );
}
