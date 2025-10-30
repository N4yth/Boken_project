"use client";
import { useEffect, useState } from "react";
import { Languages, Edit2, Save, X, Star } from "lucide-react";
import { useAuth, getCookie, refreshToken, verifyToken } from "@/utils/userAuth";
import { useRouter } from "next/navigation";
import '../../globals.css';

type Release = {
  id: string;
  total_chapter: number;
  alt_title: string;
  description: string;
}

type UserReleaseData = {
  id: string;
  release_id: string;
  personal_total_chapter: number;
  chapter_read: number;
  note: string;
  rating: number;
  reading_status: string;
  update_at: Date;
};

type Webtoon = {
  id: string;
  title: string;
  authors: string;
  status: string;
  rating: number;
  releases: Release[];
  genres: Genre[];
};

type Genre = {
  name: string;
};

export default function updateWebtoon() {
  const [webtoon, setWebtoons] = useState<Webtoon>();
  const [userelease, setUserRelease] = useState<UserReleaseData>();
  const [originalUserRelease, setOriginalUserRelease] = useState<UserReleaseData>();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();
  const { isLogged, token, mounted } = useAuth();
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const displayRating = hoverRating ?? userelease?.rating ?? 0;

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
        const token = getCookie('token');
        const response = await fetch(`http://127.0.0.1:8000/api/webtoons/${getCookie('webtoon')}/`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json"
          }
        });
        const userelease = await fetch(`http://127.0.0.1:8000/api/usereleases/with_webtoon/${getCookie('webtoon')}/`, {
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
        const userelease_data = await userelease.json();
        setUserRelease(userelease_data);
        setOriginalUserRelease(userelease_data);
      } catch (err) {
        console.error("Failed to fetch webtoons:", err);
      }
    };

    fetchWebtoons();
  }, [router]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setUserRelease(originalUserRelease);
    setIsEditing(false);
  };

  const handleSaveAll = async () => {
    if (!userelease) return;

    setIsSaving(true);
    try {
      const token = getCookie("token");
      const read = userelease.chapter_read ?? 0;
      const total = userelease.personal_total_chapter ?? 0;

      if (read > total) {
        alert("Invalid values: read count cannot exceed total chapters.");
        setIsSaving(false);
        return;
      }

      await fetch(`http://127.0.0.1:8000/api/usereleases/${userelease.id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reading_status: userelease.reading_status,
          chapter_read: read,
          personal_total_chapter: total,
          rating: userelease.rating,
          note: userelease.note,
        }),
      });

      setOriginalUserRelease(userelease);
      setIsEditing(false);
      alert("All changes saved successfully!");
    } catch (err) {
      console.error("Error saving changes:", err);
      alert("Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex flex-col">
      {/* Main Content */}
      <main className="flex-1 p-4 pb-24">
        {webtoon ? (
          <div className="max-w-4xl mx-auto">
            {/* Hero Card */}
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-6">
              {/* Header with gradient */}
              <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-4 sm:p-6 text-white">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-3 mb-4">
                  <div className="flex-1 w-full sm:w-auto">
                    <h1 className="text-2xl sm:text-3xl font-bold mb-2 break-words">
                      {webtoon.title}
                    </h1>
                    <p className="text-indigo-100 text-xs sm:text-sm break-words">by {webtoon.authors}</p>
                  </div>

                  {/* Edit/Save Buttons */}
                  {!isEditing ? (
                    <button
                      onClick={handleEdit}
                      className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white text-indigo-600 rounded-full hover:bg-indigo-50 transition-all shadow-lg text-sm sm:text-base whitespace-nowrap"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span className="font-semibold">Edit</span>
                    </button>
                  ) : (
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        onClick={handleCancel}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white/20 text-white rounded-full hover:bg-white/30 transition-all text-sm sm:text-base"
                      >
                        <X className="w-4 h-4" />
                        <span className="font-semibold">Cancel</span>
                      </button>
                      <button
                        onClick={handleSaveAll}
                        disabled={isSaving}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white text-green-600 rounded-full hover:bg-green-50 transition-all shadow-lg disabled:opacity-50 text-sm sm:text-base"
                      >
                        <Save className="w-4 h-4" />
                        <span className="font-semibold">{isSaving ? "Saving..." : "Save All"}</span>
                      </button>
                    </div>
                  )}
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

                  <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5">
                    <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                    <span className="text-xs sm:text-sm font-semibold">Your Rating:</span>

                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => {
                        const fillPercent =
                          displayRating >= i + 1
                            ? 100
                            : displayRating >= i + 0.5
                              ? 50
                              : 0;

                        return (
                          <div
                            key={i}
                            className={`relative w-4 h-4 ${isEditing ? "cursor-pointer" : ""}`}
                            onMouseMove={(e) => {
                              if (!isEditing) return;
                              const rect = e.currentTarget.getBoundingClientRect();
                              const x = e.clientX - rect.left;
                              const newHover =
                                x < rect.width / 2 ? i + 0.5 : i + 1;
                              setHoverRating(newHover);
                            }}
                            onMouseLeave={() => {
                              if (isEditing) setHoverRating(null);
                            }}
                            onClick={() => {
                              if (!isEditing) return;
                              if (hoverRating != null) {
                                setUserRelease((prev) =>
                                  prev ? { ...prev, rating: hoverRating } : prev
                                );
                              }
                            }}
                          >
                            {/* étoile vide */}
                            <Star className="absolute top-0 left-0 w-4 h-4 text-white/40 fill-white/40" />

                            {/* étoile remplie */}
                            <div
                              className="absolute top-0 left-0 overflow-hidden transition-all"
                              style={{ width: `${fillPercent}%` }}
                            >
                              <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <span className="text-xs sm:text-sm font-bold">
                      {displayRating}/5
                    </span>
                  </div>

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
                {/* Reading Progress Card */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4 sm:p-5 border border-indigo-100">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
                    <h2 className="text-lg sm:text-xl font-bold text-indigo-900">Reading Progress</h2>
                    {isEditing && (
                      <span className="text-xs text-indigo-600 font-medium bg-indigo-100 px-3 py-1 rounded-full">
                        Editing Mode
                      </span>
                    )}
                  </div>

                  {/* Status */}
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                    {isEditing ? (
                      <select
                        value={userelease?.reading_status ?? "to read"}
                        onChange={(e) => {
                          const newStatus = e.target.value as "to read" | "reading" | "finish";
                          if (!userelease) return;

                          let newChapterRead = userelease.chapter_read ?? 0;
                          const totalChapters = userelease.personal_total_chapter ?? 0;

                          if (newStatus === "to read" && newChapterRead > 0) {
                            if (!confirm("Changing status to 'to read' will reset your chapters read to 0. Continue?"))
                              return;
                            newChapterRead = 0;
                          } else if (newStatus === "finish" && newChapterRead < totalChapters) {
                            if (!confirm(`Changing status to 'finish' will set chapters read to ${totalChapters}. Continue?`))
                              return;
                            newChapterRead = totalChapters;
                          }

                          setUserRelease((prev) =>
                            prev ? { ...prev, reading_status: newStatus, chapter_read: newChapterRead } : prev
                          );
                        }}
                        className="w-full border-2 border-indigo-200 rounded-xl px-4 py-2.5 bg-white focus:border-indigo-500 focus:outline-none transition-colors"
                      >
                        <option value="to read">To Read</option>
                        <option value="reading">Reading</option>
                        <option value="finish">Finished</option>
                      </select>
                    ) : (
                      <div className="px-4 py-2.5 bg-white rounded-xl border-2 border-indigo-200">
                        <span className="font-medium text-gray-900 capitalize">
                          {userelease?.reading_status ?? "to read"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Chapters */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Chapters</label>
                    {isEditing ? (
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 mb-1">Read</label>
                          <input
                            type="number"
                            min={0}
                            value={userelease?.chapter_read ?? 0}
                            onChange={(e) => {
                              const newRead = parseInt(e.target.value, 10) || 0;
                              const total = userelease?.personal_total_chapter ?? 0;

                              if (newRead > total) {
                                alert("You cannot read more chapters than released.");
                                return;
                              }

                              setUserRelease((prev) =>
                                prev ? { ...prev, chapter_read: newRead } : prev
                              );
                            }}
                            className="w-full border-2 border-indigo-200 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-center bg-white focus:border-indigo-500 focus:outline-none text-sm sm:text-base"
                          />
                        </div>
                        <span className="text-xl sm:text-2xl font-bold text-gray-400 mt-5">/</span>
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 mb-1">Total</label>
                          <input
                            type="number"
                            min={0}
                            value={userelease?.personal_total_chapter ?? 0}
                            onChange={(e) => {
                              const newTotal = parseInt(e.target.value, 10) || 0;
                              if (userelease && userelease.chapter_read > newTotal) {
                                alert("You cannot set total chapters below your read count.");
                                return;
                              }

                              setUserRelease((prev) =>
                                prev ? { ...prev, personal_total_chapter: newTotal } : prev
                              );
                            }}
                            className="w-full border-2 border-indigo-200 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-center bg-white focus:border-indigo-500 focus:outline-none text-sm sm:text-base"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="px-3 sm:px-4 py-2 sm:py-2.5 bg-white rounded-xl border-2 border-indigo-200">
                        <span className="text-xl sm:text-2xl font-bold text-indigo-600">
                          {userelease?.chapter_read ?? 0}
                        </span>
                        <span className="text-gray-400 mx-2">/</span>
                        <span className="text-lg sm:text-xl font-semibold text-gray-700">
                          {userelease?.personal_total_chapter ?? 0}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                        style={{
                          width: `${((userelease?.chapter_read ?? 0) / (userelease?.personal_total_chapter ?? 1)) * 100
                            }%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1 text-right">
                      {(() => {
                        const read = userelease?.chapter_read ?? 0;
                        const total = userelease?.personal_total_chapter ?? 0;

                        if (total <= 0) return "0% Complete"; // évite NaN

                        const percent = Math.round((read / total) * 100);
                        return `${percent}% Complete`;
                      })()}
                    </p>
                  </div>
                </div>

                {/* Personal Note */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 sm:p-5 border border-amber-100">
                  <h2 className="text-lg sm:text-xl font-bold text-amber-900 mb-3">Personal Note</h2>
                  {isEditing ? (
                    <textarea
                      value={userelease?.note ?? ""}
                      onChange={(e) =>
                        setUserRelease((prev) =>
                          prev ? { ...prev, note: e.target.value } : prev
                        )
                      }
                      placeholder="Write your thoughts about this webtoon..."
                      rows={4}
                      className="w-full border-2 border-amber-200 rounded-xl p-3 sm:p-4 text-sm sm:text-base text-gray-800 resize-none focus:border-amber-500 focus:outline-none bg-white"
                    />
                  ) : (
                    <div className="px-3 sm:px-4 py-3 bg-white rounded-xl border-2 border-amber-200 min-h-[100px]">
                      <p className="text-sm sm:text-base text-gray-700 whitespace-pre-wrap break-words">
                        {userelease?.note || "No notes yet. Click Edit to add your thoughts!"}
                      </p>
                    </div>
                  )}
                </div>

                {/* Alternative Title */}
                {webtoon.releases?.[0]?.alt_title && (
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <Languages className="w-4 sm:w-5 h-4 sm:h-5 text-indigo-600" />
                      Also Known As
                    </h2>
                    <p className="text-sm sm:text-base text-gray-600 bg-gray-50 rounded-xl px-3 sm:px-4 py-3 border border-gray-200 break-words">
                      {webtoon.releases[0].alt_title}
                    </p>
                  </div>
                )}

                {/* Description */}
                {webtoon.releases?.[0]?.description && (
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-2">
                      Description
                    </h2>
                    <p className="text-sm sm:text-base text-gray-700 leading-relaxed bg-gray-50 rounded-xl px-3 sm:px-4 py-3 border border-gray-200 break-words">
                      {webtoon.releases[0].description}
                    </p>
                  </div>
                )}

                {/* Last Update */}
                <div className="text-xs sm:text-sm text-gray-500 text-center pt-4 border-t border-gray-200">
                  Last Updated: {userelease?.update_at
                    ? new Date(userelease.update_at).toLocaleDateString("en-US", {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                    : "No update date"}
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