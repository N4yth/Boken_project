import { Compass, Search, BookMarked, Inbox, SlidersHorizontal, type LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  private?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/advanced_search", label: "Search", icon: Search },
  { href: "/library", label: "Library", icon: BookMarked, private: true },
  { href: "/news", label: "Requests", icon: Inbox, private: true },
  { href: "/settings", label: "Settings", icon: SlidersHorizontal },
];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
