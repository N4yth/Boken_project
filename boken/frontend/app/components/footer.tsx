"use client";

import { Search, Home, User, Settings, Bell } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";
import { useAuth } from "@/utils/userAuth";

export default function Footer() {
  const router = useRouter();
  const pathname = usePathname();
  const { isLogged } = useAuth();

  const handleLibrary = useCallback(() => {
    if (!isLogged) {
      alert("Please login to go to your library");
      return;
    }
    router.push("/library");
  }, [router, isLogged]);

  const handleHome = useCallback(() => {
    router.push("/");
  }, [router]);

  const handleNews = useCallback(() => {
    if (!isLogged) {
      alert("Please login to go to your library");
      return;
    }
    router.push("/news");
  }, [router, isLogged]);

  const handleAdvancedSearch = useCallback(() => {
    router.push("/advanced_search");
  }, [router]);

  const isActive = (path: string) => pathname === path;

  if (pathname !== "/login") {
    return (
      <footer>
        <nav
          className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 shadow-lg"
          aria-label="Main navigation"
        >
          <div className="flex justify-between items-center max-w-md mx-auto">
            <button
              className={`p-2 ${isActive("/news") ? "text-indigo-600 hover:text-indigo-700" : "text-gray-400 hover:text-gray-600"}`}
              aria-label="news"
              onClick={handleNews}
            >
              <Bell className="w-6 h-6" />
            </button>
            <button
              className={`p-2 ${isActive("/advanced_search") ? "text-indigo-600 hover:text-indigo-700" : "text-gray-400 hover:text-gray-600"}`}
              aria-label="Search"
              onClick={handleAdvancedSearch}
            >
              <Search className="w-6 h-6" />
            </button>
            <button
              className={`p-2 ${isActive("/") ? "text-indigo-600 hover:text-indigo-700" : "text-gray-400 hover:text-gray-600"}`}
              aria-label="Home"
              onClick={handleHome}
            >
              <Home className="w-6 h-6" />
            </button>
            <button
              className={`p-2 ${isActive("/library") ? "text-indigo-600 hover:text-indigo-700" : "text-gray-400 hover:text-gray-600"}`}
              aria-label="Profile"
              onClick={handleLibrary}
            >
              <User className="w-6 h-6" />
            </button>
            <button
              className={`p-2 ${isActive("/settings") ? "text-indigo-600 hover:text-indigo-700" : "text-gray-400 hover:text-gray-600"}`}
              aria-label="Settings"
            >
              <Settings className="w-6 h-6" />
            </button>
          </div>
        </nav>
      </footer>
    );
  }
  return;
}
