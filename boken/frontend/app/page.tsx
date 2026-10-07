"use client";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Check, Minus, Plus } from "lucide-react";
import Cover from "@/components/Cover";
import { Container } from "@/components/ui";
import { useAuth } from "@/utils/userAuth";
import { api } from "@/lib/api";
import { useOpenWebtoon } from "@/lib/hooks";
import type { Genre, Webtoon } from "@/lib/types";

export default function Landing() {
  const [webtoons, setWebtoons] = useState<Webtoon[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const { isLogged, mounted } = useAuth();
  const openWebtoon = useOpenWebtoon();

  useEffect(() => {
    api<Webtoon[]>("/api/webtoon/", { auth: false })
      .then(setWebtoons)
      .catch((err) => console.error("Failed to fetch webtoons:", err));
    api<Genre[]>("/api/genre/", { auth: false })
      .then(setGenres)
      .catch((err) => console.error("Failed to fetch genres:", err));
  }, []);

  const chapters = webtoons.reduce((sum, w) => sum + (w.releases?.[0]?.total_chapter ?? 0), 0);
  const primary = mounted && isLogged ? { href: "/library", label: "Open my library" } : { href: "/login", label: "Create an account" };

  return (
    <div className="overflow-x-clip">
      <Hero primary={primary} />

      {webtoons.length > 0 && (
        <section className="border-y border-line bg-sheet">
          <Container>
            <dl className="grid grid-cols-3 divide-x divide-line">
              <Figure value={webtoons.length} label="Series listed" />
              <Figure value={chapters} label="Chapters tracked" />
              <Figure value={genres.length} label="Genres" />
            </dl>
          </Container>
        </section>
      )}

      {webtoons.length > 0 && <Shelf webtoons={webtoons} onOpen={openWebtoon} />}

      <Container className="py-20 sm:py-28">
        <div className="max-w-2xl">
          <p className="eyebrow mb-4">How it works</p>
          <h2 className="display text-5xl sm:text-7xl">Three panels, nothing more</h2>
          <p className="mt-5 text-[17px] leading-relaxed text-muted">
            Boken does not host chapters. It keeps track of the ones you read on your usual platforms, so you never
            have to scroll back through 200 episodes to find your place.
          </p>
        </div>

        <div className="mt-14 grid gap-3 md:grid-cols-6 md:grid-rows-[auto_auto]">
          <Panel className="md:col-span-4" caption="Find" title="Browse the catalogue">
            <p>
              Search by title or author, filter by genre, status, chapter count or rating. Add a series to your shelf
              in one tap.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {(genres.length ? genres.slice(0, 6).map((g) => g.name) : ["Action", "Fantasy", "Romance", "Drama"]).map((name) => (
                <span key={name} className="chip bg-paper">
                  {name}
                </span>
              ))}
            </div>
          </Panel>

          <Panel className="bg-ink text-paper md:col-span-2 md:row-span-2" caption="Track" title="Every chapter, counted" dark>
            <p className="text-paper/70">Plus one after each episode. Your rating and notes stay next to it.</p>
            <ProgressDemo />
          </Panel>

          <Panel className="md:col-span-4" caption="Share" title="Add what is missing">
            <p>
              A series is not listed yet? Create the entry for yourself. Submit it and an admin reviews it before it
              goes public for everyone.
            </p>
            <span className="mt-6 inline-flex -rotate-3 items-center rounded border-2 border-jade px-3 py-1 font-display text-sm font-extrabold uppercase tracking-wider text-jade">
              Approved
            </span>
          </Panel>
        </div>
      </Container>

      <section className="relative overflow-hidden bg-[#14213D] text-[#F3EFE6]">
        <FocusLines className="text-[#F3EFE6]/[0.07]" />
        <Container className="relative py-20 text-center sm:py-28">
          <h2 className="display mx-auto max-w-3xl text-5xl sm:text-8xl">Your next chapter is waiting</h2>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              href={primary.href}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-[#F3EFE6] px-6 text-[15px] font-semibold text-[#14213D] transition-opacity hover:opacity-90"
            >
              {primary.label} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/discover"
              className="inline-flex h-12 items-center rounded-full border border-[#F3EFE6]/30 px-6 text-[15px] font-semibold transition-colors hover:border-[#F3EFE6]/70"
            >
              Browse first
            </Link>
          </div>
        </Container>
      </section>

      <Container className="flex flex-col gap-2 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>Boken, a reading log for manhwa and manhua.</p>
        <p>Made by Nathan Dupuis and Laura Aupetit, 2026.</p>
      </Container>
    </div>
  );
}

function Hero({ primary }: { primary: { href: string; label: string } }) {
  return (
    <section className="relative isolate">
      <FocusLines className="text-ink/[0.06]" />
      <div className="halftone halftone-fade pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-2/3 text-ink/[0.08]" />

      <Container className="flex flex-col items-center pb-16 pt-10 text-center sm:pb-24 sm:pt-16">
        <p className="eyebrow animate-rise">Manhwa, manhua and webtoons</p>

        <h1 className="mt-6 w-full max-w-[880px] animate-rise [animation-delay:80ms]">
          <span className="sr-only">Boken</span>
          <BigLogo />
        </h1>

        <p className="mt-4 max-w-xl animate-rise text-lg leading-relaxed text-muted [animation-delay:160ms] sm:text-xl">
          The reading log for people who follow too many series at once. Know exactly where you stopped, in every one
          of them.
        </p>

        <div className="mt-10 flex animate-rise flex-wrap justify-center gap-3 [animation-delay:240ms]">
          <Link
            href="/discover"
            className="inline-flex h-12 items-center gap-2 rounded-full bg-ink px-6 text-[15px] font-semibold text-paper transition-opacity hover:opacity-90"
          >
            Explore the catalogue <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={primary.href}
            className="inline-flex h-12 items-center rounded-full border border-line bg-sheet px-6 text-[15px] font-semibold transition-colors hover:border-ink/40"
          >
            {primary.label}
          </Link>
        </div>
      </Container>
    </section>
  );
}

// The PNG has a lot of white margin: the wrapper keeps only the lettering box
// (x 170 to 1370, y 95 to 740 on the 1536x1024 source)
function BigLogo() {
  return (
    <span className="relative mx-auto block aspect-[1200/645] w-full overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/Boken_title.png"
        alt=""
        className="absolute left-[-14.17%] top-[-14.73%] w-[128%] max-w-none mix-blend-multiply dark:mix-blend-screen dark:invert"
      />
    </span>
  );
}

function FocusLines({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 -z-10 ${className}`}
      style={{
        backgroundImage:
          "repeating-conic-gradient(from 0deg at 50% 45%, currentColor 0deg 0.8deg, transparent 0.8deg 6deg)",
        WebkitMaskImage: "radial-gradient(ellipse at 50% 45%, transparent 22%, black 75%)",
        maskImage: "radial-gradient(ellipse at 50% 45%, transparent 22%, black 75%)",
      }}
    />
  );
}

function Figure({ value, label }: { value: number; label: string }) {
  return (
    <div className="px-3 py-6 text-center sm:py-8">
      <dd className="font-mono text-3xl tabular-nums tracking-tight sm:text-5xl">{value.toLocaleString("en-US")}</dd>
      <dt className="eyebrow mt-2">{label}</dt>
    </div>
  );
}

function Shelf({ webtoons, onOpen }: { webtoons: Webtoon[]; onOpen: (id: string) => void }) {
  const row = webtoons.slice(0, 16);
  return (
    <section className="py-16 sm:py-20" aria-label="Series on Boken">
      <Container className="mb-8 flex items-end justify-between gap-4">
        <h2 className="text-xl font-semibold">On the shelf right now</h2>
        <Link
          href="/discover"
          className="inline-flex items-center gap-1 text-sm font-semibold underline decoration-seal decoration-2 underline-offset-4"
        >
          See all
        </Link>
      </Container>
      <div className="group relative [mask-image:linear-gradient(90deg,transparent,black_6%,black_94%,transparent)]">
        <ul className="flex w-max animate-marquee gap-4 group-hover:[animation-play-state:paused] motion-reduce:animate-none">
          {[...row, ...row].map((w, i) => (
            <li key={`${w.id}-${i}`} aria-hidden={i >= row.length} className="w-36 shrink-0 sm:w-44">
              <button
                type="button"
                tabIndex={i >= row.length ? -1 : 0}
                onClick={() => onOpen(w.id)}
                className="block w-full text-left transition-transform duration-300 hover:-translate-y-1"
                aria-label={`Open ${w.title}`}
              >
                <Cover title={w.title} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Panel({
  caption,
  title,
  children,
  className = "",
  dark = false,
}: {
  caption: string;
  title: string;
  children: ReactNode;
  className?: string;
  dark?: boolean;
}) {
  return (
    <article
      className={`relative overflow-hidden rounded-panel border p-6 sm:p-8 ${
        dark ? "border-transparent" : "border-line bg-sheet"
      } ${className}`}
    >
      <span
        className={`inline-block border px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.14em] ${
          dark ? "border-paper/40 bg-paper text-ink" : "border-ink bg-paper"
        }`}
      >
        {caption}
      </span>
      <h3 className="display mt-5 text-3xl sm:text-4xl">{title}</h3>
      <div className={`mt-3 text-[15px] leading-relaxed ${dark ? "" : "text-muted"}`}>{children}</div>
    </article>
  );
}

// Small interactive copy of the real progress counter from the library page
function ProgressDemo() {
  const total = 24;
  const [read, setRead] = useState(17);
  return (
    <div className="mt-8 rounded-panel border border-paper/15 bg-paper/[0.04] p-5">
      <div className="flex items-end justify-between">
        <p className="font-mono text-4xl tabular-nums">
          {String(read).padStart(3, "0")}
          <span className="text-xl text-paper/50"> / {String(total).padStart(3, "0")}</span>
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setRead((r) => Math.max(0, r - 1))}
            className="grid h-10 w-10 place-items-center rounded-full border border-paper/25 hover:border-paper/60"
            aria-label="One chapter less"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            onClick={() => setRead((r) => Math.min(total, r + 1))}
            className="grid h-10 w-10 place-items-center rounded-full bg-paper text-ink"
            aria-label="One chapter more"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="mt-5 flex gap-[3px]" aria-hidden="true">
        {Array.from({ length: total }).map((_, i) => (
          <span key={i} className={`h-2.5 flex-1 rounded-[2px] ${i < read ? "bg-seal" : "bg-paper/15"}`} />
        ))}
      </div>
      <p className="mt-3 flex items-center gap-1.5 font-mono text-xs text-paper/60">
        {read === total ? (
          <>
            <Check className="h-3.5 w-3.5" /> All caught up
          </>
        ) : (
          `${total - read} to go`
        )}
      </p>
    </div>
  );
}
