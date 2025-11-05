"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import { Search, Plus, User, Users } from "lucide-react";
import { useAuth, getCookie, refreshToken, verifyToken } from "@/utils/userAuth";
import WebtoonCard from "@/components/Webtoon_card"
import { useRouter } from "next/navigation";
import '../globals.css';

type Release = {
  id: string;
  total_chapter: number;
}

type Webtoon = {
  id: string;
  title: string;
  authors: string;
  rating: number;
  releases: Release[];
  UR_rating: number;
  UR_total_chapter: number;
};

export default function Library() {
  const [webtoons, setWebtoons] = useState<Webtoon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [switchData, setSwitch] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [visibleCount, setVisibleCount] = useState(10);
  const { isLogged, token } = useAuth();

  useEffect(() => {
    const checkLogin = async () => {
      const valid = await verifyToken(token);
      if (!valid) {
        const refresh = await refreshToken();
        if (!refresh) {
          router.push('/')
          return;
        }
      }
    };
    checkLogin();
  }, [isLogged, token]);

  const handleswitch = useCallback(() => {
    setSwitch(!switchData)
  }, [switchData]);

  // Fetch webtoons
  useEffect(() => {
    const fetchWebtoons = async () => {
      try {
        const token = getCookie('token');

        // Check if token exists before making request
        if (!token) {
          // Clear any remaining cookies
          document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          document.cookie = "username=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          router.push("/");
          return;
        }

        const response = await fetch("http://127.0.0.1:8000/api/webtoons/get_library/", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          }
        });

        if (response.status === 401 || response.status === 403) {
          router.push("/");
          return;
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log(data);
        setWebtoons(data);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch webtoons:", err);
        setError("Failed to load webtoons. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchWebtoons();
  }, [router]);

  // Memoize filtered webtoons for performance
  const filteredWebtoons = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return webtoons;

    return webtoons.filter((webtoon) =>
      webtoon.title.toLowerCase().includes(query) ||
      webtoon.authors.toLowerCase().includes(query)
    );
  }, [webtoons, searchQuery]);

  // Gestion du scroll infini
  useEffect(() => {
    const handleScroll = () => {
      const bottom =
        window.innerHeight + window.scrollY >=
        document.body.offsetHeight - 300;

      if (bottom && visibleCount < filteredWebtoons.length) {
        setVisibleCount((prev) => prev + 10);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [visibleCount, filteredWebtoons.length]);

  // Si on change complètement de recherche → on repart à 10
  useEffect(() => {
    setVisibleCount(10);
  }, [filteredWebtoons]);


  const handleWebtoonClick = useCallback((webtoonId: string) => {
    document.cookie = `webtoon=${webtoonId}; path=/; max-age=900; sameSite=lax;`;
    router.push("/library/update_webtoon")
  }, [router]);
  

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Search Header */}
      <header className="bg-white px-4 py-3 shadow-sm flex justify-between items-center">
        <div className="relative max-w-md w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search webtoons or authors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            aria-label="Search webtoons"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={handleswitch}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-gray/20 text-black rounded-full hover:bg-indigo/30 transition-all text-sm sm:text-base"
          >
              {switchData ? (
                <Users className="w-4 h-4" />
              ) : (
                <User className="w-4 h-4" />
              )}
            
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 space-y-3 pb-20">
        {loading ? (
          <div className="text-center text-gray-500 py-10">
            <div className="animate-pulse">Loading webtoons...</div>
          </div>
        ) : error ? (
          <div className="text-center text-red-500 py-10">
            <p>{error}</p>
          </div>
        ) : filteredWebtoons.length === 0 ? (
          <div className="text-center text-gray-500 py-10">
            <p>
              {searchQuery
                ? `No webtoons found for "${searchQuery}"`
                : "No webtoons available."}
            </p>
          </div>
        ) : (
          filteredWebtoons.map((webtoon) => (
            <WebtoonCard
              key={webtoon.id}
              id={webtoon.id}
              title={webtoon.title}
              authors={webtoon.authors}
              rating={switchData ? webtoon.rating : webtoon.UR_rating}
              totalChapters={switchData ? webtoon.releases?.[0]?.total_chapter : webtoon.UR_total_chapter}
              onClick={handleWebtoonClick}
            />
          ))
        )}
        {/* bouton add webtoon */}
        <button
          onClick={() => router.push("/library/add_webtoon")}
          className="fixed bottom-24 right-10 bg-purple-300 hover:bg-purple-500 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-transform hover:scale-110"
        >
          <Plus className="w-6 h-6" />
        </button>
      </main>
    </div>
  );
}