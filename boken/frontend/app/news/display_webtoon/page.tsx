"use client";
import { useEffect, useState, useCallback } from "react";
import { BookOpen, Languages, Calendar, CheckCircle, XCircle } from "lucide-react";
import { useAuth, verifyToken, getCookie, refreshToken } from "@/utils/userAuth"
import { useRouter } from "next/navigation";
import '../../globals.css';

type Release = {
  id: string;
  total_chapter: number;
  alt_title: string;
  description: string;
}

type Webtoon = {
  id: string;
  title: string;
  authors: string;
  status: string;
  releases: Release[];
  genres: Genre[];
  update_at: Date;
};

type Genre = {
  name: string;
};


export default function updateWebtoon() {
  const [webtoon, setWebtoons] = useState<Webtoon>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const { isLogged, token, mounted } = useAuth();

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
    const fetchWebtoons = async () => {
      try {
        if (!mounted) return;
        const response = await fetch(`http://127.0.0.1:8000/api/webtoons/${getCookie('webtoon')}/`, {
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
  }, [router, mounted]);

  const handleDenied = useCallback(() => {
    if (confirm("are you sure to refuse this webtoon ?")) {
      console.log("refuse")
      router.push("/news")
    }
  }, [router]);

  const HandleAccept = useCallback(() => {
    if (confirm("are you sure to accept this webtoon ?")) {
      console.log("accept")
      router.push("/news")
    }
  }, [router]);

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
                </div>

                {/* Status */}
                <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3 sm:gap-4">
                  <span
                    className={`px-3 sm:px-4 py-1.5 text-xs font-bold rounded-full ${webtoon.status === "Ongoing"
                      ? "bg-green-400 text-green-900"
                      : "bg-gray-300 text-gray-800"
                      }`}
                  >
                    {webtoon.status}
                  </span>

                  {/* Total Chapters Badge */}
                  <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5">
                    <BookOpen className="w-4 h-4" />
                    <span className="text-xs sm:text-sm font-semibold">
                      {webtoon.releases[0]?.total_chapter ?? 0} Chapters
                    </span>
                  </div>
                </div>

                {/* Genres */}
                {webtoon.genres && webtoon.genres.length > 0 ? (
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
                ) : (
                  <div className="text-sm text-gray-400 italic font-normal">
                    No genres for this webtoon
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
                      {webtoon.releases[0]?.total_chapter === 0 && (
                        <div className="text-sm text-gray-400 italic font-normal">
                          The number of chapters is not found or not out in this language
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
                {webtoon.releases?.[0]?.description ? (
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 sm:p-5 border border-amber-100">
                    <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3">
                      Description
                    </h2>
                    <p className="text-sm sm:text-base text-gray-700 leading-relaxed break-words">
                      {webtoon.releases[0].description}
                    </p>
                  </div>
                ) : (
                  <div className="text-sm text-gray-400 italic font-normal">
                    No description
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
        <div className="flex justify-center">
          <div className="flex gap-3 mt-2 mb-2">
            <button
              onClick={HandleAccept}
              className="flex items-center justify-center gap-2 w-32 px-4 py-2.5 bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-lg shadow-md hover:shadow-lg hover:opacity-90 active:scale-95 transition-all font-medium text-sm sm:text-base"
            >
              <CheckCircle className="w-5 h-5" />
              Accept
            </button>

            <button
              onClick={handleDenied}
              className="flex items-center justify-center gap-2 w-32 px-4 py-2.5 bg-gradient-to-r from-pink-500 to-red-500 text-white rounded-lg shadow-md hover:shadow-lg hover:opacity-90 active:scale-95 transition-all font-medium text-sm sm:text-base"
            >
              <XCircle className="w-5 h-5" />
              Deny
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}