"use client";
import { useEffect, useState, useCallback } from "react";
import { Search, ChevronDown, ChevronUp, X, Filter } from "lucide-react";
import { useRouter } from "next/navigation";
import { verifyToken, useAuth, refreshToken } from "@/utils/userAuth";
import WebtoonCard from "@/components/Webtoon_card";

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
  addable: boolean;
};

type UserReleaseData = {
  release_id: string;
  chapter_read: number;
  personal_total_chapter: number;
  note: string;
  rating: number;
  reading_status: string;
};

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
  const { isLogged, token } = useAuth();
  const [favoriteLoading, setFavoriteLoading] = useState<string | null>(null);
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

  const handleFavorite = useCallback(async (webtoonId: string, releaseId: string) => {
    if (!isLogged || !token) {
      alert("Please login to add favorites");
      return;
    }

    setFavoriteLoading(releaseId);

    try {
      const requestData: UserReleaseData = {
        release_id: releaseId,
        personal_total_chapter: 0,
        chapter_read: 0,
        note: "",
        rating: 0.0,
        reading_status: "to read"
      };

      const creation_response = await fetch("http://127.0.0.1:8000/api/usereleases/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });

      if (!creation_response.ok) {
        throw new Error(`HTTP error! status: ${creation_response.status}`);
      }

      setSearchResults(prevResults =>
        prevResults.map(wt =>
          wt.id === webtoonId ? { ...wt, addble: false } : wt
        )
      );

      alert("Added to your reading list!");
    } catch (err) {
      console.error("Failed to add favorite:", err);
      alert("Failed to add to reading list. Please try again.");
    } finally {
      setFavoriteLoading(null);
    }
  }, [isLogged, token]);

  const handleWebtoonClick = useCallback((webtoonId: string) => {
    document.cookie = `webtoon=${webtoonId}; path=/; max-age=900; sameSite=strict;`;
    router.push("/display_webtoon");
  }, [router]);

  // Handle search
  const handleSearch = async () => {
    setLoading(true);
    setHasSearched(true);
    setShowFilters(false);

    try {
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

      if (token && token !== "" && token !== "undefined") {
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

  useEffect(() => {
    const handleScroll = () => {
      const bottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 300;
      if (bottom && visibleCount < searchResults.length) {
        setVisibleCount((prev) => prev + 10);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [visibleCount, searchResults.length]);

  useEffect(() => {
    setVisibleCount(10);
  }, [searchResults]);

  const handlefilter = () => {
    setShowFilters(!showFilters); 
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header - Mobile optimized */}
      <header className="bg-white px-4 py-3 shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-indigo-600">
              Advanced Search
            </h1>
          </div>
          <button
            onClick={handlefilter}
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

              {/* Action Buttons */}
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
                {searchResults.slice(0, visibleCount).map((webtoon) => {
                  const firstRelease = webtoon.releases?.[0];
                  const isLoadingThis = favoriteLoading === firstRelease?.id;

                  return (
                    <WebtoonCard
                      key={webtoon.id}
                      id={webtoon.id}
                      title={webtoon.title}
                      authors={webtoon.authors}
                      rating={webtoon.rating}
                      totalChapters={firstRelease?.total_chapter || 0}
                      onClick={handleWebtoonClick}
                      showFavorite={isLogged}
                      isAddable={webtoon.addable}
                      releaseId={firstRelease?.id}
                      onFavoriteClick={handleFavorite}
                    />
                  );
                })}

                {visibleCount < searchResults.length && (
                  <div className="text-center text-gray-400 py-6">
                    Loading more...
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}