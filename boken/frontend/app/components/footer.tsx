"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/utils/userAuth";
import { NAV_ITEMS, isActive } from "./nav";

// Bottom tab bar on phones, the header carries navigation from md up
export default function Footer() {
  const pathname = usePathname();
  const { isLogged } = useAuth();

  if (pathname === "/login") return null;

  return (
    <nav
      aria-label="Main"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/90 backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const href = item.private && !isLogged ? "/login" : item.href;
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 pb-2 pt-2.5 text-[10.5px] font-semibold tracking-wide transition-colors ${
                  active ? "text-ink" : "text-muted"
                }`}
              >
                <span
                  className={`grid h-8 w-12 place-items-center rounded-full transition-colors ${
                    active ? "bg-ink text-paper" : ""
                  }`}
                >
                  <Icon className="h-[19px] w-[19px]" strokeWidth={active ? 2.2 : 1.8} />
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
