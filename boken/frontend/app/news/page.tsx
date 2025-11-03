"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { verifyToken, useAuth, refreshToken } from "@/utils/userAuth";
import '../globals.css';


type User = {
  username: string;
}

type Webtoon = {
  id: string;
  title: string;
  authors: string;
  rating: number;
  addable: boolean;
  add_by: User;
};

export default function HomePage() {
  const [webtoons, setWebtoons] = useState<Webtoon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [adminOrNot, setadminOrNot] = useState<boolean | null>(null);
  const router = useRouter();
  const { isLogged, token, mounted } = useAuth();
  const [visibleCount, setVisibleCount] = useState(10);

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


  // Fetch webtoons
  useEffect(() => {
    if (!mounted) return;
    const fetchWebtoons = async () => {
      try {
        if (isLogged) {
          const response = await fetch("http://127.0.0.1:8000/api/webtoons/check/", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            }
          });

          if (!response.ok) {
            if (response.status === 403) {
              setadminOrNot(false)
            } else {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
          } else {
            const data = await response.json();
            setWebtoons(data);
            setError(null);
          }
        }
      } catch (err) {
        console.error("Failed to fetch webtoons:", err);
        setError("Failed to load webtoons. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchWebtoons();
  }, [isLogged, token, mounted]);

  // Memoize filtered webtoons for performance
  const filteredWebtoons = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return webtoons;

    return webtoons.filter((webtoon) =>
      webtoon.title.toLowerCase().includes(query) ||
      webtoon.authors.toLowerCase().includes(query)
    );
  }, [webtoons, searchQuery]);

  const handleWebtoonClick = useCallback((webtoonId: string) => {
    document.cookie = `webtoon=${webtoonId}; path=/; max-age=900; sameSite=strict;`;
    router.push("/news/display_request");
  }, [router]);

  // Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      const bottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 300;
      if (bottom && visibleCount < filteredWebtoons.length) {
        setVisibleCount(prev => prev + 10);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [visibleCount, filteredWebtoons.length]);

  // Reset visible count on search change
  useEffect(() => {
    setVisibleCount(10);
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
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
        ) : webtoons.length === 0 ? (
          <div className="text-center text-gray-500 py-10">
            <p>
              {searchQuery
                ? `No request found for "${searchQuery}"`
                : "No request for new publish webtoon."}
            </p>
          </div>
        ) : (
          <>
            {webtoons.slice(0, visibleCount).map((webtoon) => {
              return (
                <article
                  key={webtoon.id}
                  className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 rounded-2xl shadow-md p-4 relative hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleWebtoonClick(webtoon.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-1 text-white pr-8">
                      <h3 className="text-lg font-semibold mb-1">A webtoon created by : {webtoon.add_by.username}</h3>
                      <p className="text-sm opacity-90 mb-2">named : {webtoon.title}</p>
                    </div>
                  </div>
                </article>
              );
            })}

            {visibleCount < filteredWebtoons.length && (
              <div className="text-center text-gray-400 py-6">
                Loading more...
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}