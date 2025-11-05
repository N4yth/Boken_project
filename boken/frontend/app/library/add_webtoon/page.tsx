"use client";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, BookOpen, Users, Calendar, Tag, Languages, FileText, CheckCircle, Star, Hash } from "lucide-react";
import { useAuth } from "@/utils/userAuth";
import { useRouter } from "next/navigation";
import '../../globals.css';

type Genre = {
  id: string;
  name: string;
};

export default function AddWebtoonPage() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [language, setLanguage] = useState<string>("eng");
  const [title, setTitle] = useState("");
  const [authors, setAuthors] = useState("");
  const [chapters, setChapters] = useState("");
  const [status, setStatus] = useState("in progress");
  const router = useRouter();
  const [releaseDate, setReleaseDate] = useState<string>("");
  const [genresLoading, setGenresLoading] = useState(true);
  const [showGenres, setShowGenres] = useState(false);
  const [description, setDescription] = useState("");
  const [waitingReview, setWaitingReview] = useState(false);
  const { isLogged, token, mounted } = useAuth();
  const [authChecking, setAuthChecking] = useState(true);
  const [altTitle, setAltTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState(false);

  // Authentication check
  useEffect(() => {
    if (!mounted) return;
    
    if (!isLogged) {
      router.push('/login');
      return;
    }
    setAuthChecking(false);
  }, [isLogged, router, mounted]);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [chapterRead, setChapterRead] = useState("");
  const [personalNote, setPersonalNote] = useState("");
  const [personalTotalChapter, setPersonalTotalChapter] = useState("");
  const [personalRating, setPersonalRating] = useState(0);
  const [readingStatus, setReadingStatus] = useState("to read");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccess(false);

    // Validation
    if (selectedGenres.length === 0) {
      setError("Please select at least one genre");
      setIsSubmitting(false);
      return;
    }

    if (!chapters || parseInt(chapters) < 0) {
      setError("Please enter a valid number of chapters");
      setIsSubmitting(false);
      return;
    }

    // Format data with personal information
    const newWebtoon = {
      title,
      authors,
      genres: selectedGenres,
      release_date: releaseDate,
      status,
      waiting_review: waitingReview,
      rating: 0,
      alt_title: altTitle,
      description,
      language: "eng",
      total_chapter: parseInt(chapters),
      // Personal information
      chapter_read: chapterRead ? parseInt(chapterRead) : 0,
      note: personalNote || "",
      personal_total_chapter: personalTotalChapter ? parseInt(personalTotalChapter) : 0,
      personal_rating: personalRating || 0,
      reading_status: readingStatus || "to read",
    };

    try {
      const response = await fetch("http://127.0.0.1:8000/api/webtoons/full_create/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newWebtoon),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to create webtoon: ${response.status}`);
      }

      setSuccess(true);

      // Reset form after success
      setTimeout(() => {
        setTitle("");
        setAuthors("");
        setAltTitle("");
        setDescription("");
        setChapters("");
        setReleaseDate("");
        setSelectedGenres([]);
        setWaitingReview(false);
        setStatus("in progress");
        setLanguage("eng");
        setChapterRead("");
        setPersonalNote("");
        setPersonalTotalChapter("");
        setPersonalRating(0);
        setReadingStatus("to read");
        setSuccess(false);

        router.push("/library");
      }, 1500);

    } catch (err) {
      console.error("Error:", err);
      setError(err instanceof Error ? err.message : "An error occurred while creating the webtoon");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleGenre = (genreId: string) => {
    setSelectedGenres(prev =>
      prev.includes(genreId)
        ? prev.filter(id => id !== genreId)
        : [...prev, genreId]
    );
  };

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

  if (authChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="animate-pulse">Checking authentication...</div>
        </div>
      </div>
    );
  }

  if (!isLogged) {
    return null; // This will prevent any flash of content while redirecting
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 sm:p-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white flex items-center gap-3">
            <BookOpen className="w-8 h-8" />
            Add New Webtoon
          </h1>
          <p className="text-purple-100 mt-2">Fill in the details to create a new webtoon entry</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3 animate-pulse">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-green-800 font-medium">Webtoon created successfully!</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <BookOpen className="w-4 h-4 text-purple-600" />
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-purple-500 focus:outline-none transition-colors"
              placeholder="Enter webtoon title"
              required
            />
          </div>

          {/* Alt Title */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <FileText className="w-4 h-4 text-purple-600" />
              Alternative Title *
            </label>
            <input
              type="text"
              value={altTitle}
              onChange={(e) => setAltTitle(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-purple-500 focus:outline-none transition-colors"
              placeholder="Enter alternative title"
              required
            />
          </div>

          {/* Authors */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Users className="w-4 h-4 text-purple-600" />
              Authors *
            </label>
            <input
              type="text"
              value={authors}
              onChange={(e) => setAuthors(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-purple-500 focus:outline-none transition-colors"
              placeholder="Enter author names"
              required
            />
          </div>

          {/* Release Date & Language */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Calendar className="w-4 h-4 text-purple-600" />
                Release Date *
              </label>
              <input
                type="date"
                value={releaseDate}
                onChange={(e) => setReleaseDate(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-purple-500 focus:outline-none transition-colors"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Languages className="w-4 h-4 text-purple-600" />
                Language *
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-purple-500 focus:outline-none transition-colors"
              >
                <option value="eng">English</option>
                <option value="fra">French</option>
                <option value="spa">Spanish</option>
                <option value="jpn">Japanese</option>
                <option value="kor">Korean</option>
              </select>
            </div>
          </div>

          {/* Status & Chapters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Tag className="w-4 h-4 text-purple-600" />
                Status *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-purple-500 focus:outline-none transition-colors"
              >
                <option value="in progress">In Progress</option>
                <option value="finish">Finished</option>
                <option value="pause">Paused</option>
                <option value="cancel">Cancelled</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <FileText className="w-4 h-4 text-purple-600" />
                Total Chapters *
              </label>
              <input
                type="number"
                value={chapters}
                onChange={(e) => setChapters(e.target.value)}
                min="0"
                max="9999"
                className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-purple-500 focus:outline-none transition-colors"
                placeholder="0"
                required
              />
            </div>
          </div>

          {/* Genres */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowGenres(!showGenres)}
              className="w-full flex items-center justify-between bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-4 hover:border-purple-400 transition-all"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Tag className="w-4 h-4 text-purple-600" />
                Genres {selectedGenres.length > 0 && `(${selectedGenres.length} selected)`} *
              </span>
              {showGenres ? <ChevronUp className="w-5 h-5 text-purple-600" /> : <ChevronDown className="w-5 h-5 text-purple-600" />}
            </button>

            {showGenres && (
              <div className="border-2 border-purple-200 rounded-lg p-4 max-h-64 overflow-y-auto bg-gray-50">
                {genresLoading ? (
                  <p className="text-center text-gray-500 py-8">Loading genres...</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {genres.map((genre) => (
                      <label
                        key={genre.id}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-white cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedGenres.includes(genre.id)}
                          onChange={() => toggleGenre(genre.id)}
                          className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 cursor-pointer"
                        />
                        <span className="text-sm text-gray-700">{genre.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <FileText className="w-4 h-4 text-purple-600" />
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Write a brief description of the webtoon..."
              rows={4}
              className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-purple-500 focus:outline-none transition-colors resize-none"
            />
          </div>

          {/* Waiting Review Checkbox */}
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <input
              type="checkbox"
              id="waitingReview"
              checked={waitingReview}
              onChange={(e) => setWaitingReview(e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="waitingReview" className="text-sm font-medium text-gray-700 cursor-pointer">
              Submit for review
            </label>
          </div>

          {/* Personal Information Section */}
          <div className="border-t-4 border-amber-300 pt-6 mt-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Star className="w-6 h-6 text-amber-500" />
              Personal Information
            </h2>
            <p className="text-sm text-gray-600 mb-6">Track your reading progress for this webtoon</p>

            {/* Reading Status */}
            <div className="space-y-2 mb-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Tag className="w-4 h-4 text-amber-600" />
                Reading Status
              </label>
              <select
                value={readingStatus}
                onChange={(e) => setReadingStatus(e.target.value)}
                className="w-full border-2 border-amber-200 rounded-lg p-3 focus:border-amber-500 focus:outline-none transition-colors"
              >
                <option value="to read">To Read</option>
                <option value="reading">Reading</option>
                <option value="finish">Completed</option>
              </select>
            </div>

            {/* Chapters Read & Personal Total */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Hash className="w-4 h-4 text-amber-600" />
                  Chapters Read
                </label>
                <input
                  type="number"
                  value={chapterRead}
                  onChange={(e) => setChapterRead(e.target.value)}
                  min="0"
                  max="9999"
                  className="w-full border-2 border-amber-200 rounded-lg p-3 focus:border-amber-500 focus:outline-none transition-colors"
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Hash className="w-4 h-4 text-amber-600" />
                  Personal Total Chapters
                </label>
                <input
                  type="number"
                  value={personalTotalChapter}
                  onChange={(e) => setPersonalTotalChapter(e.target.value)}
                  min="0"
                  max="9999"
                  className="w-full border-2 border-amber-200 rounded-lg p-3 focus:border-amber-500 focus:outline-none transition-colors"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Personal Rating */}
            <div className="space-y-2 mb-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Star className="w-4 h-4 text-amber-600" />
                Your Rating
              </label>

              <div className="flex items-center gap-3">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => {
                    const starValue = i + 1;
                    const fillPercent =
                      (hoverRating ?? personalRating) >= starValue
                        ? 100
                        : (hoverRating ?? personalRating) >= starValue - 0.5
                        ? 50
                        : 0;

                    return (
                      <div
                        key={i}
                        className="relative w-6 h-6 cursor-pointer"
                        onMouseMove={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = e.clientX - rect.left;
                          const newHover =
                            x < rect.width / 2 ? starValue - 0.5 : starValue;
                          setHoverRating(newHover);
                        }}
                        onMouseLeave={() => setHoverRating(null)}
                        onClick={() => {
                          if (hoverRating != null) {
                            setPersonalRating(hoverRating);
                          }
                        }}
                      >
                        <Star className="absolute top-0 left-0 w-6 h-6 text-gray-300 fill-gray-300" />
                        <div
                          className="absolute top-0 left-0 overflow-hidden transition-all duration-150"
                          style={{ width: `${fillPercent}%` }}
                        >
                          <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <span className="text-sm font-semibold text-gray-700">
                  {personalRating > 0 ? `${personalRating}/5` : "No rating"}
                </span>
              </div>
            </div>


            {/* Personal Note */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <FileText className="w-4 h-4 text-amber-600" />
                Personal Note
              </label>
              <textarea
                value={personalNote}
                onChange={(e) => setPersonalNote(e.target.value)}
                placeholder="Add your personal notes about this webtoon..."
                rows={3}
                className="w-full border-2 border-amber-200 rounded-lg p-3 focus:border-amber-500 focus:outline-none transition-colors resize-none"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-4 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
          >
            {isSubmitting ? "Creating..." : "Create Webtoon"}
          </button>

          {/* Back Button */}
          <button
            type="button"
            onClick={() => router.push("/library")}
            className="w-full text-purple-600 font-medium py-2 hover:text-purple-700 transition-colors"
          >
            ← Back to Library
          </button>
        </form>
      </div>
    </div>
  );
}