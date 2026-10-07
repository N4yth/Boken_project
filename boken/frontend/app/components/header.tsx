"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/utils/userAuth";
import { useFeedback } from "./feedback";
import { NAV_ITEMS, isActive } from "./nav";
import Logo from "./Logo";

export default function Header() {
  const { isLogged, username, mounted, logout } = useAuth();
  const { confirm, toast } = useFeedback();
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/login") return null;

  const handleLogout = async () => {
    const ok = await confirm({
      title: "Log out?",
      body: "Your library stays saved, you can pick it back up any time.",
      confirmLabel: "Log out",
    });
    if (!ok) return;
    logout();
    toast("See you soon");
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="Boken home" className="shrink-0">
          <Logo />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.filter((item) => !item.private || isLogged).map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                  active ? "text-ink" : "text-muted hover:text-ink"
                }`}
              >
                {item.label}
                {active && <span className="absolute inset-x-3.5 -bottom-[13px] h-[2px] rounded-full bg-seal" />}
              </Link>
            );
          })}
        </nav>

        <div className="flex min-w-0 items-center gap-2">
          {!mounted ? (
            <span className="h-9 w-24 animate-pulse rounded-full bg-ink/[0.06]" />
          ) : isLogged ? (
            <>
              <span className="flex min-w-0 items-center gap-2 rounded-full border border-line bg-sheet py-1 pl-1 pr-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink font-display text-sm font-bold uppercase text-paper">
                  {username.charAt(0) || "?"}
                </span>
                <span className="truncate text-sm font-medium">{username}</span>
              </span>
              <button
                onClick={handleLogout}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-ink/[0.06] hover:text-seal"
                aria-label="Log out"
                title="Log out"
              >
                <LogOut className="h-[18px] w-[18px]" />
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="inline-flex h-9 items-center rounded-full bg-ink px-4 text-sm font-semibold text-paper transition-opacity hover:opacity-90"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
