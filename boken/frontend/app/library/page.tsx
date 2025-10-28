"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import { Search, Home, User, Settings, Bell, Heart, LogIn, LogOut, Languages } from "lucide-react";
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
};

type AuthState = {
    isLogged: boolean;
    username: string;
};

type UserReleaseData = {
    release_id: string;
    chapter_read: number;
    note: string;
    rating: number;
    reading_status: string;
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

// Custom hook for authentication state
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

export default function Library() {
    const [webtoons, setWebtoons] = useState<Webtoon[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [favoriteLoading, setFavoriteLoading] = useState<string | null>(null);
    const router = useRouter();
    const { isLogged, username } = useAuth();

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

    // Handle navigation
    const handleLogin = useCallback(() => {
        router.push("/login");
    }, [router]);

    const handleLibrary = useCallback(() => {
        if (!isLogged) {
            alert("Please login to go to you'r library");
            return;
        }
        router.push("/library");
    }, [router]);

    const handleHome = useCallback(() => {
        router.push("/");
    }, [router]);

    const handleLogout = useCallback(() => {
        // Remove cookies
        document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie = "username=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

        // Close modal
        setShowLogoutConfirm(false);

        // Optionally redirect to home or refresh
        window.location.reload();
    }, []);






    const handleWebtoonClick = useCallback((webtoonId: string) => {
        // Add navigation logic here
        console.log("Webtoon clicked:", webtoonId);
    }, []);

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

                {/* Auth Section */}
                {isLogged ? (
                    <div className="ml-4 flex items-center gap-3">
                        <div className="flex items-center gap-2 text-indigo-600 font-semibold">
                            <User className="w-5 h-5" />
                            <span className="hidden sm:inline">{username}</span>
                        </div>
                        <button
                            className="flex items-center gap-1 text-red-500 hover:text-red-600 font-semibold transition-colors"
                            onClick={() => setShowLogoutConfirm(true)}
                            aria-label="Logout"
                        >
                            <LogOut className="w-5 h-5" />
                            <span className="hidden sm:inline">Logout</span>
                        </button>
                    </div>
                ) : (
                    <button
                        className="ml-4 flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-semibold transition-colors"
                        onClick={handleLogin}
                        aria-label="Login"
                    >
                        <LogIn className="w-5 h-5" />
                        <span className="hidden sm:inline">Login</span>
                    </button>
                )}
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
                        <article
                            key={webtoon.id}
                            className="bg-gradient-to-br from-indigo-200 via-indigo-300 to-indigo-400 rounded-2xl shadow-md p-4 relative hover:shadow-lg transition-shadow cursor-pointer"
                            onClick={() => handleWebtoonClick(webtoon.id)}
                        >

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
                    ))
                )}
            </main>

            {/* Bottom Navigation */}
            <nav
                className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 shadow-lg"
                aria-label="Main navigation"
            >
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

            {/* Logout Confirmation Modal */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Confirm Logout
                        </h3>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to logout?
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                                onClick={() => setShowLogoutConfirm(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-4 py-2 text-white bg-red-500 hover:bg-red-600 rounded-lg font-medium transition-colors"
                                onClick={handleLogout}
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}