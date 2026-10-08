"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { Button, Container, PageHeader } from "@/components/ui";
import { useTheme, type ThemeChoice } from "@/components/theme";
import { useFeedback } from "@/components/feedback";
import { useAuth } from "@/utils/userAuth";

const THEMES: { value: ThemeChoice; label: string; icon: LucideIcon }[] = [
  { value: "light", label: "Paper", icon: Sun },
  { value: "dark", label: "Night", icon: Moon },
  { value: "system", label: "Match device", icon: Monitor },
];

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { isLogged, username, mounted, logout } = useAuth();
  const { confirm, toast } = useFeedback();
  const router = useRouter();

  const handleLogout = async () => {
    const ok = await confirm({ title: "Log out?", confirmLabel: "Log out" });
    if (!ok) return;
    logout();
    toast("See you soon");
    router.push("/");
  };

  return (
    <Container className="max-w-3xl pt-8 sm:pt-12">
      <PageHeader eyebrow="Preferences" title="Settings" />

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Appearance</h2>
        <p className="mt-1 text-sm text-muted">Night is easier on the eyes for long reading sessions.</p>
        <div role="radiogroup" aria-label="Theme" className="mt-5 grid grid-cols-3 gap-3">
          {THEMES.map(({ value, label, icon: Icon }) => {
            const active = theme === value;
            return (
              <button
                key={value}
                role="radio"
                aria-checked={active}
                onClick={() => setTheme(value)}
                className={`group overflow-hidden rounded-panel border text-left transition-colors ${
                  active ? "border-ink ring-1 ring-ink" : "border-line hover:border-ink/40"
                }`}
              >
                <ThemeSwatch value={value} />
                <span className="flex items-center gap-2 bg-sheet px-3 py-2.5 text-sm font-semibold">
                  <Icon className="h-4 w-4" />
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-12 border-t border-line pt-8">
        <h2 className="text-lg font-semibold">Account</h2>
        {!mounted ? (
          <div className="mt-5 h-16 animate-pulse rounded-panel bg-ink/[0.06]" />
        ) : isLogged ? (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-panel border border-line bg-sheet p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-ink font-display text-lg font-bold uppercase text-paper">
                {username.charAt(0) || "?"}
              </span>
              <div>
                <p className="font-semibold">{username}</p>
                <p className="text-sm text-muted">Signed in</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Log out
            </Button>
          </div>
        ) : (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-panel border border-line bg-sheet p-4">
            <p className="text-sm text-muted">Sign in to keep a library and track your chapters.</p>
            <Link
              href="/login"
              className="inline-flex h-9 items-center rounded-full bg-ink px-4 text-sm font-semibold text-paper"
            >
              Sign in
            </Link>
          </div>
        )}
      </section>
    </Container>
  );
}

// Fixed colors on purpose: each swatch previews its own theme whatever the current one is
function ThemeSwatch({ value }: { value: ThemeChoice }) {
  const light = { bg: "#F3EFE6", card: "#FBF9F4", ink: "#14213D", line: "#D6CFC0" };
  const dark = { bg: "#0C101C", card: "#141929", ink: "#ECE7DC", line: "#2E354A" };

  const pane = (c: typeof light) => (
    <div className="flex h-full flex-1 flex-col gap-1.5 p-2.5" style={{ backgroundColor: c.bg }}>
      <div className="h-1.5 w-1/2 rounded-full" style={{ backgroundColor: c.ink }} />
      <div className="flex flex-1 gap-1.5">
        <div className="flex-1 rounded" style={{ backgroundColor: "#1B3A70" }} />
        <div className="flex-1 rounded" style={{ backgroundColor: "#C8412B" }} />
        <div className="flex-1 rounded border" style={{ backgroundColor: c.card, borderColor: c.line }} />
      </div>
    </div>
  );

  return (
    <div className="flex h-20 border-b border-line">
      {value === "system" ? (
        <>
          {pane(light)}
          {pane(dark)}
        </>
      ) : (
        pane(value === "light" ? light : dark)
      )}
    </div>
  );
}
