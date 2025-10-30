"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import { Search, Heart, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { verifyToken, useAuth, refreshToken } from "@/utils/userAuth";
import './globals.css';

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
  addable: boolean;
};

type UserReleaseData = {
  release_id: string;
  chapter_read: number;
  note: string;
  rating: number;
  reading_status: string;
  personal_total_chapter: number;
};

export default function HomePage() {
  const [webtoons, setWebtoons] = useState<Webtoon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState<string | null>(null);
  const router = useRouter();
  const { isLogged, token, mounted } = useAuth();
  const [visibleCount, setVisibleCount] = useState(10);

  useEffect(() => {
    if (isLogged) {
      const checkLogin = async () => {
        const valid = await verifyToken(token);
        if (!valid) {
          await refreshToken();
        }
      };
      checkLogin();
    }  
  }, [isLogged, token]);


  // Fetch webtoons
  useEffect(() => {
    if (!mounted) return;
    const fetchWebtoons = async () => {
      try {
        if (isLogged) {
          const response = await fetch("http://127.0.0.1:8000/api/webtoons/logged_user/", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            }
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          setWebtoons(data);
          setError(null);
        } else {
          const response = await fetch("http://127.0.0.1:8000/api/webtoons/");
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          setWebtoons(data);
          setError(null);
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

  const handleFavorite = useCallback(async (webtoonId: string, releaseId: string) => {
    if (!isLogged) {
      alert("Please login to add favorites");
      return;
    }

    setFavoriteLoading(releaseId);

    try {
      const requestData: UserReleaseData = {
        release_id: releaseId,
        chapter_read: 0,
        personal_total_chapter: 0,
        note: "",
        rating: 0.0,
        reading_status: "to read"
      };
      if (isLogged) {
        const response = await fetch("http://127.0.0.1:8000/api/usereleases/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(requestData)
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }
      else {
        alert('please login before add to your library')
      }
      setWebtoons(prevWebtoons =>
        prevWebtoons.map(wt =>
          wt.id === webtoonId ? { ...wt, addable: false } : wt
        )
      );

      alert("Added to your reading list!");
    } catch (err) {
      console.error("Failed to add favorite:", err);
      alert("Failed to add to reading list. Please try again.");
    } finally {
      setFavoriteLoading(null);
    }
  }, [isLogged]);

  const handleWebtoonClick = useCallback((webtoonId: string) => {
    document.cookie = `webtoon=${webtoonId}; path=/; max-age=900; sameSite=strict;`;
    router.push("/display_webtoon");
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
          <>
            {filteredWebtoons.slice(0, visibleCount).map((webtoon) => {
              const firstRelease = webtoon.releases?.[0];
              const isLoadingThis = favoriteLoading === firstRelease?.id;

              return (
                <article
                  key={webtoon.id}
                  className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 rounded-2xl shadow-md p-4 relative hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleWebtoonClick(webtoon.id)}
                >
                  {isLogged && (
                    <button
                      className={`
                        absolute top-4 right-4 z-9 transition-all duration-200
                        ${webtoon.addable
                          ? 'text-pink-500 cursor-not-allowed'
                          : 'text-white hover:text-pink-500 cursor-pointer'
                        }
                        disabled:opacity-50
                      `}
                      onClick={(e) => {
                        e.stopPropagation();

                        if (webtoon.addable) {
                          alert("This webtoon is already in your library");
                          return;
                        }
                        if (!firstRelease) {
                          alert("This webtoon doesn't have a release yet!");
                          return;
                        }

                        setWebtoons((prev) =>
                          prev.map((wt) =>
                            wt.id === webtoon.id ? { ...wt, addable: false } : wt
                          )
                        );

                        handleFavorite(webtoon.id, firstRelease.id);
                      }}
                      disabled={isLoadingThis || !firstRelease}
                      aria-label={`${!webtoon.addable ? 'Already in library' : 'Add to library'}: ${webtoon.title}`}
                    >
                      {isLoadingThis ? (
                        <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Heart
                          className={`w-6 h-6 transition-colors duration-200 ${webtoon.addable
                            ? 'text-white hover:text-pink-500'
                            : 'text-pink-500 fill-pink-500'
                            }`}
                        />
                      )}
                    </button>
                  )}

                  <div className="flex items-center gap-4">
                    <div className="flex-1 text-white pr-8">
                      <h3 className="text-lg font-semibold mb-1">{webtoon.title}</h3>
                      <p className="text-sm opacity-90 mb-2">{webtoon.authors}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {firstRelease?.total_chapter || 0} Chap
                        </span>
                        <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-2 py-1">
                          <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => {
                              const rating = webtoon?.rating ?? 0;
                              const fillPercent = rating >= i + 1 ? 100 : rating >= i + 0.5 ? 50 : 0;
                              return (
                                <div key={i} className="relative w-3.5 h-3.5">
                                  <Star className="absolute top-0 left-0 w-3.5 h-3.5 text-white/40 fill-white/40" />
                                  <div
                                    className="absolute top-0 left-0 overflow-hidden"
                                    style={{ width: `${fillPercent}%` }}
                                  >
                                    <Star className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <span className="text-xs sm:text-sm font-bold">
                            {webtoon?.rating ?? 0}/5
                          </span>
                        </div>
                      </div>
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