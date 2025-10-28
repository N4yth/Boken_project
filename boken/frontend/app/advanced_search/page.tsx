"use client";
import { useEffect, useState, useCallback } from "react";
import { Search, Home, User, Settings, Bell, Heart, ChevronDown, ChevronUp, X, Filter } from "lucide-react";
import { useRouter } from "next/navigation";

type Genre = {
  id: string;
  name: string;
};

type Release = {
  id: string;
  total_chapter: number;
};

type Webtoon = {
  id: string;
  title: string;
  authors: string;
  rating: number;
  releases: Release[];
};

type UserReleaseData = {
  release_id: string;
  chapter_read: number;
  note: string;
  rating: number;
  reading_status: string;
};

type AuthState = {
  isLogged: boolean;
  username: string;
};

// Utility function to get cookie value
function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const cookies: Record<string, string> = {};
  document.cookie.split('; ').forEach(cookie => {
    const [key, value] = cookie.split('=');
    if (key && value) {
      cookies[key] = decodeURIComponent(value);
    }
  });
  return cookies[name];
}

function useAuth(): AuthState {
  const [authState, setAuthState] = useState<AuthState>(() => {
    if (typeof document === 'undefined') return { isLogged: false, username: "" };
    const token = getCookie('token');
    const username = getCookie('username');
    return { isLogged: !!token, username: username || "" };
  });

  useEffect(() => {
    const checkAuth = () => {
      const token = getCookie('token');
      const username = getCookie('username');
      setAuthState({ isLogged: !!token, username: username || "" });
    };

    window.addEventListener('focus', checkAuth);
    const interval = setInterval(checkAuth, 1000);

    return () => {
      window.removeEventListener('focus', checkAuth);
      clearInterval(interval);
    };
  }, []);

  return authState;
}

export default function AdvancedSearch() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [webtoonTitle, setWebtoonTitle] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [minChapters, setMinChapters] = useState("");
  const [maxChapters, setMaxChapters] = useState("");
  const [minRating, setMinRating] = useState("");
  const [maxRating, setMaxRating] = useState("");
  const [status, setStatus] = useState("");
  const router = useRouter();
  const [searchResults, setSearchResults] = useState<Webtoon[]>([]);
  const [loading, setLoading] = useState(false);
  const [genresLoading, setGenresLoading] = useState(true);
  const [showGenres, setShowGenres] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const { isLogged, username } = useAuth();
  const [favoriteLoading, setFavoriteLoading] = useState<string | null>(null);

  // Fetch genres on mount
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/api/genres/");
        if (response.ok) {
          const data = await response.json();
          setGenres(data);
        }
      } catch (err) {
        console.error("Failed to fetch genres:", err);
      } finally {
        setGenresLoading(false);
      }
    };
    fetchGenres();
  }, []);

  // Toggle genre selection
  const toggleGenre = (genreId: string) => {
    setSelectedGenres(prev =>
      prev.includes(genreId)
        ? prev.filter(id => id !== genreId)
        : [...prev, genreId]
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedGenres([]);
    setWebtoonTitle("");
    setAuthorName("");
    setMinChapters("");
    setMaxChapters("");
    setMinRating("");
    setMaxRating("");
    setStatus("");
    setSearchResults([]);
    setHasSearched(false);
  };

  const handleFavorite = useCallback(async (releaseId: string) => {
    if (!isLogged) {
      alert("Please login to add favorites");
      return;
    }

    setFavoriteLoading(releaseId);

    try {
      const token = getCookie('token');
      const requestData: UserReleaseData = {
        release_id: releaseId,
        chapter_read: 0,
        note: "",
        rating: 0.0,
        reading_status: "to read"
      };

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

      const data = await response.json();
      console.log("Added to favorites:", data);
      alert("Added to your reading list!");
    } catch (err) {
      console.error("Failed to add favorite:", err);
      alert("Failed to add to reading list. Please try again.");
    } finally {
      setFavoriteLoading(null);
    }
  }, [isLogged]);

  const handleWebtoonClick = useCallback((webtoonId: string) => {
    console.log("Webtoon clicked:", webtoonId);
  }, []);

  // Handle search
  const handleSearch = async () => {
    setLoading(true);
    setHasSearched(true);
    setShowFilters(false); // Hide filters on mobile after search

    try {
      const token = getCookie('token');

      // Build query parameters
      const params = new URLSearchParams();
      if (webtoonTitle) params.append('title', webtoonTitle);
      if (authorName) params.append('author', authorName);
      if (minChapters) params.append('min_chapters', minChapters);
      if (maxChapters) params.append('max_chapters', maxChapters);
      if (minRating) params.append('min_rating', minRating);
      if (maxRating) params.append('max_rating', maxRating);
      if (status) params.append('status', status);
      if (selectedGenres.length > 0) {
        selectedGenres.forEach(genreId => params.append('genres', genreId));
      }

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(
        `http://127.0.0.1:8000/api/webtoons/search/?${params.toString()}`,
        {
          method: "GET",
          headers
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error("Search failed:", err);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleHome = useCallback(() => {
    router.push("/");
  }, [router]);

  const handleLibrary = useCallback(() => {
    if (!isLogged) {
      alert("Please login to go to you'r library");
      return;
    }
    router.push("/library");
  }, [router]);

  // Count active filters
  const activeFiltersCount = [
    webtoonTitle,
    authorName,
    minChapters,
    maxChapters,
    minRating,
    maxRating,
    status,
    selectedGenres.length > 0
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header - Mobile optimized */}
      <header className="bg-white px-4 py-3 shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-indigo-600">
            Advanced Search
          </h1>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-100 text-indigo-600 rounded-lg font-medium hover:bg-indigo-200 transition-colors"
          >
            <Filter className="w-5 h-5" />
            {activeFiltersCount > 0 && (
              <span className="bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {/* Search Form - Collapsible on mobile */}
        {showFilters && (
          <div className="bg-white border-b border-gray-200 shadow-sm">
            <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
              {/* Title Search */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Webtoon Title
                </label>
                <input
                  type="text"
                  placeholder="Enter title..."
                  value={webtoonTitle}
                  onChange={(e) => setWebtoonTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Author Search */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Author Name
                </label>
                <input
                  type="text"
                  placeholder="Enter author name..."
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Genres Selection */}
              <div>
                <button
                  onClick={() => setShowGenres(!showGenres)}
                  className="w-full flex items-center justify-between text-xs font-semibold text-gray-700 mb-1 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span>
                    Genres {selectedGenres.length > 0 && `(${selectedGenres.length})`}
                  </span>
                  {showGenres ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showGenres && (
                  <div className="grid grid-cols-2 gap-2 p-2 border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                    {genresLoading ? (
                      <p className="col-span-2 text-center text-gray-500 text-xs">Loading...</p>
                    ) : (
                      genres.map((genre) => (
                        <label
                          key={genre.id}
                          className="flex items-center gap-1.5 cursor-pointer hover:bg-gray-50 p-1.5 rounded text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={selectedGenres.includes(genre.id)}
                            onChange={() => toggleGenre(genre.id)}
                            className="w-3.5 h-3.5 text-indigo-600 rounded focus:ring-indigo-500"
                          />
                          <span className="text-gray-700">{genre.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Chapters Range */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Chapters
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minChapters}
                    onChange={(e) => setMinChapters(e.target.value)}
                    min="0"
                    max="9999"
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-gray-400 text-xs">to</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxChapters}
                    onChange={(e) => setMaxChapters(e.target.value)}
                    min="0"
                    max="9999"
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Rating Range */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Rating
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minRating}
                    onChange={(e) => setMinRating(e.target.value)}
                    min="0"
                    max="5"
                    step="0.5"
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-gray-400 text-xs">to</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxRating}
                    onChange={(e) => setMaxRating(e.target.value)}
                    min="0"
                    max="5"
                    step="0.5"
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                  <option value="hiatus">Hiatus</option>
                </select>
              </div>

              {/* Action Buttons - Sticky at bottom of filters */}
              <div className="flex gap-2 pt-2 sticky bottom-0 bg-white pb-2">
                <button
                  onClick={clearFilters}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Clear
                </button>
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:bg-indigo-400"
                >
                  <Search className="w-4 h-4" />
                  {loading ? "Searching..." : "Search"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search Results */}
        {hasSearched && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-gray-800">
                Results ({searchResults.length})
              </h2>
              {!showFilters && (
                <button
                  onClick={() => setShowFilters(true)}
                  className="flex items-center gap-1 text-indigo-600 text-sm font-medium"
                >
                  <Filter className="w-4 h-4" />
                  Filters
                </button>
              )}
            </div>

            {loading ? (
              <div className="text-center text-gray-500 py-10">
                <div className="animate-pulse text-sm">Searching...</div>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center text-gray-500 py-10">
                <p className="text-sm">No webtoons found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {searchResults.map((webtoon) => (
                  <article
                    key={webtoon.id}
                    className="bg-gradient-to-br from-indigo-200 via-indigo-300 to-indigo-400 rounded-2xl shadow-md p-4 relative hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => handleWebtoonClick(webtoon.id)}
                  >
                    {/* Favorite Button */}
                    <button
                      className="absolute top-4 right-4 text-pink-500 hover:text-pink-600 transition-colors z-9 disabled:opacity-50"
                      onClick={(e) => {
                        e.stopPropagation();

                        // Sécurise l'accès à la première release
                        const firstRelease = webtoon.releases?.[0];
                        if (!firstRelease) {
                          alert("Ce webtoon n’a pas encore de release associée !");
                          return;
                        }

                        // Envoie l'ID correct
                        handleFavorite(firstRelease.id);
                      }}
                      disabled={favoriteLoading === webtoon.releases?.[0]?.id || !webtoon.releases?.length}
                      aria-label={`Add ${webtoon.title} to favorites`}
                    >
                      {favoriteLoading === webtoon.releases?.[0]?.id ? (
                        <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Heart className="w-6 h-6 fill-current" />
                      )}
                    </button>

                    <div className="flex items-center gap-4">
                      <div className="flex-1 text-white pr-8">
                        <h3 className="text-lg font-semibold mb-1">
                          {webtoon.title}
                        </h3>
                        <p className="text-sm opacity-90 mb-2">
                          {webtoon.authors}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {webtoon.releases?.[0]?.total_chapter} Chap
                          </span>
                          <div className="flex gap-1" aria-label={`Rating: ${webtoon.rating} out of 5`}>
                            {[...Array(5)].map((_, i) => {
                              const rating = webtoon.rating;
                              let fillClass = "bg-white/20"; // par défaut : vide

                              if (rating >= i + 1) {
                                fillClass = "bg-white"; // rond plein
                              } else if (rating >= i + 0.5) {
                                fillClass = "bg-gradient-to-r from-white to-white/20"; // rond à moitié rempli
                              }

                              return (
                                <div
                                  key={i}
                                  className={`w-2.5 h-2.5 rounded-full ${fillClass}`}
                                />
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 shadow-lg">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <button
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-6 h-6" />
          </button>
          <button
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Search"
          >
            <Search className="w-6 h-6" />
          </button>
          <button
            className="p-2 text-indigo-600 hover:text-indigo-700 transition-colors"
            aria-label="Home"
            onClick={() => handleHome()}
          >
            <Home className="w-6 h-6" />
          </button>
          <button
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Profile"
            onClick={() => handleLibrary()}
          >
            <User className="w-6 h-6" />
          </button>
          <button
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Settings"
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </nav>
    </div>
  );
}