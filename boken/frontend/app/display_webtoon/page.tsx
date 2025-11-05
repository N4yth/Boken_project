"use client";
import { useEffect, useState, useCallback } from "react";
import { Heart, Languages, Star, BookOpen, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import { verifyToken, useAuth, refreshToken, getCookie } from "@/utils/userAuth";
import '../globals.css';

type Release = {
  id: string;
  total_chapter: number;
  alt_title: string;
  description: string;
}

type UserReleaseData = {
  release_id: string;
  chapter_read: number;
  personal_total_chapter: number,
  note: string;
  rating: number;
  reading_status: string;
};

type Webtoon = {
  id: string;
  title: string;
  authors: string;
  status: string;
  rating: number;
  addable: boolean;
  releases: Release[];
  genres: Genre[];
  update_at: Date;
};

type Genre = {
  name: string;
};


export default function displayWebtoon() {
  const [webtoon, setWebtoons] = useState<Webtoon>();
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const router = useRouter();
  const { isLogged, token } = useAuth();


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

  useEffect(() => {
    const fetchWebtoons = async () => {
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        const token2 = getCookie("token");
        if (token2 && token2 !== "" && token2 !== 'undefined') {
          headers["Authorization"] = `Bearer ${token2}`;
        }

        const webtoonId = getCookie("webtoon");
        if (!webtoonId) {
          router.push('/');
          return;
        }
        //console.log(headers)
        const response = await fetch(
          `http://127.0.0.1:8000/api/webtoons/${webtoonId}/`,
          {
            method: "GET",
            headers,
          }
        );

        if (response.status === 403) {
          router.push("/");
          return;
        } else if (response.status === 401) {
          
        } 
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setWebtoons(data);
      } catch (err) {
        console.error("Failed to fetch webtoons:", err);
      }
    };

    fetchWebtoons();
  }, [isLogged, token, router]);

  const handleFavorite = useCallback(async () => {
    if (!isLogged) {
      alert("Please login to add to your library");
      return;
    }

    if (!webtoon?.releases?.[0]?.id) {
      alert("Unable to add to library");
      return;
    }

    setFavoriteLoading(true);

    try {
      const requestData: UserReleaseData = {
        release_id: webtoon.releases[0].id,
        chapter_read: 0,
        personal_total_chapter: webtoon.releases[0].total_chapter,
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
      console.log("Added to library:", data);
      alert("Added to your library!");
    } catch (err) {
      console.error("Failed to add to library:", err);
      alert("Failed to add to library. It may already be in your collection.");
    } finally {
      setFavoriteLoading(false);
    }
  }, [isLogged, token, webtoon]);


  //console.log(getCookie('token'))
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex flex-col">
      <main className="flex-1 p-4 pb-24">
        {webtoon ? (
          <div className="max-w-4xl mx-auto">
            {/* Hero Card */}
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-6">
              {/* Header with gradient */}
              <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-4 sm:p-6 text-white">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-3 mb-4">
                  <div className="flex-1 w-full sm:w-auto">
                    <h1 className="text-2xl sm:text-3xl font-bold mb-2 break-words">
                      {webtoon.title}
                    </h1>
                    <p className="text-indigo-100 text-xs sm:text-sm break-words">by {webtoon.authors}</p>
                  </div>

                  {/* Add to Library Button */}
                  <button
                    onClick={handleFavorite}
                    disabled={webtoon.addable || favoriteLoading}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all shadow-lg whitespace-nowrap
                    ${webtoon.addable
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-white text-pink-600 hover:bg-pink-50"
                      }
                    ${favoriteLoading ? "opacity-50" : ""}
                  `}
                  >
                    {!webtoon.addable ? (
                      <>
                        <Heart className="w-4 h-4" />
                        <span className="font-semibold">
                          {favoriteLoading ? "Adding..." : "Add to Library"}
                        </span>
                      </>
                    ) : (
                      <>
                        <Heart className="w-4 h-4" />
                        <span className="font-semibold">
                          already added
                        </span>
                      </>
                    )}
                  </button>
                </div>

                {/* Status and Ratings Row */}
                <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3 sm:gap-4">
                  <span
                    className={`px-3 sm:px-4 py-1.5 text-xs font-bold rounded-full ${webtoon.status === "Ongoing"
                      ? "bg-green-400 text-green-900"
                      : "bg-gray-300 text-gray-800"
                      }`}
                  >
                    {webtoon.status}
                  </span>

                  {/* Community Rating */}
                  <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5">
                    <span className="text-xs sm:text-sm font-semibold">Community:</span>

                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => {
                        const rating = webtoon?.rating ?? 0;
                        const fillPercent =
                          rating >= i + 1 ? 100 : rating >= i + 0.5 ? 50 : 0;

                        return (
                          <div key={i} className="relative w-4 h-4">
                            {/* étoile vide */}
                            <Star className="absolute top-0 left-0 w-4 h-4 text-white/40 fill-white/40" />
                            {/* étoile remplie */}
                            <div
                              className="absolute top-0 left-0 overflow-hidden"
                              style={{ width: `${fillPercent}%` }}
                            >
                              <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <span className="text-xs sm:text-sm font-bold">
                      {webtoon?.rating ?? 0}/5
                    </span>
                  </div>

                  {/* Total Chapters Badge */}
                  <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5">
                    <BookOpen className="w-4 h-4" />
                    <span className="text-xs sm:text-sm font-semibold">
                      {webtoon.releases[0]?.total_chapter ?? 0} Chapters
                    </span>
                  </div>
                </div>

                {/* Genres */}
                {webtoon.genres && webtoon.genres.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {webtoon.genres.map((genre: Genre, index: number) => (
                      <span
                        key={index}
                        className="px-2 sm:px-3 py-1 text-xs font-medium bg-white/20 backdrop-blur-sm text-white rounded-full"
                      >
                        {genre.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Content Section */}
              <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                {/* Info Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Status Card */}
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4 border border-indigo-100">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-3 h-3 rounded-full ${webtoon.status === "Ongoing" ? "bg-green-500" : "bg-gray-500"
                        }`} />
                      <h3 className="text-sm font-semibold text-gray-700">Publication Status</h3>
                    </div>
                    <p className="text-xl font-bold text-indigo-900 capitalize">
                      {webtoon.status}
                    </p>
                  </div>

                  {/* Chapters Card */}
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-4 border border-purple-100">
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen className="w-4 h-4 text-purple-600" />
                      <h3 className="text-sm font-semibold text-gray-700">Total Chapters</h3>
                    </div>
                    <div className="text-xl font-bold text-purple-900">
                      {webtoon.releases[0]?.total_chapter && (
                        <div className="text-sm text-gray-400 italic font-normal">
                          The number of chapters is not found or not out in this language (0)
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Alternative Title */}
                {webtoon.releases?.[0]?.alt_title && (
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-4 sm:p-5 border border-blue-100">
                    <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <Languages className="w-4 sm:w-5 h-4 sm:h-5 text-blue-600" />
                      Also Known As
                    </h2>
                    <p className="text-sm sm:text-base text-gray-700 break-words">
                      {webtoon.releases[0].alt_title}
                    </p>
                  </div>
                )}

                {/* Description */}
                {webtoon.releases?.[0]?.description && (
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 sm:p-5 border border-amber-100">
                    <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3">
                      Description
                    </h2>
                    <p className="text-sm sm:text-base text-gray-700 leading-relaxed break-words">
                      {webtoon.releases[0].description}
                    </p>
                  </div>
                )}

                {/* Last Update */}
                <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-gray-500 pt-4 border-t border-gray-200">
                  <Calendar className="w-4 h-4" />
                  <span>
                    Last Updated: {webtoon?.update_at
                      ? new Date(webtoon.update_at).toLocaleDateString("en-US", {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                      : "No update date"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading webtoon details...</p>
          </div>
        )}
      </main>
    </div>
  );
}