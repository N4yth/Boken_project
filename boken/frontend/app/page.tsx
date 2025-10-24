"use client";
import { useEffect, useState } from "react";
import { Search, Home, User, Settings, Bell, Heart, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import './globals.css';

type Webtoon = {
  id: number;
  title: string;
  authors: string;
};

export default function Library() {
  const [webtoons, setWebtoons] = useState<Webtoon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const isLogged = typeof window !== "undefined" 
    ? document.cookie.split("; ").some(row => row.startsWith("token=")) 
    : false;


  // Récupération des webtoons
  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/webtoons/")
      .then((res) => res.json())
      .then((data) => {
        setWebtoons(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch webtoons:", err);
        setLoading(false);
      });
  }, []);

  const filteredWebtoons = webtoons.filter((webtoon) =>
    webtoon.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    webtoon.authors.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Search Header avec bouton Login conditionnel */}
      <header className="bg-white px-4 py-3 shadow-sm flex justify-between items-center">
        <div className="relative max-w-md w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* Bouton Login conditionnel */}
        {!isLogged && (
          <button
            className="ml-4 flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-semibold"
            onClick={() => router.push("/login")}
          >
            <LogIn className="w-5 h-5" />
            Login
          </button>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 space-y-3 pb-20">
        {loading ? (
          <p className="text-center text-gray-500 py-10">Loading webtoons...</p>
        ) : filteredWebtoons.length === 0 ? (
          <p className="text-center text-gray-500 py-10">No webtoons found.</p>
        ) : (
          filteredWebtoons.map((webtoon) => (
            <div
              key={webtoon.id}
              className="bg-gradient-to-br from-indigo-200 via-indigo-300 to-indigo-400 rounded-2xl shadow-md p-4 relative hover:shadow-lg transition-shadow cursor-pointer"
            >
              {/* Heart Icon */}
              <button className="absolute top-4 right-4 text-pink-500 hover:text-pink-600 transition-colors">
                <Heart className="w-6 h-6 fill-current" />
              </button>

              <div className="flex items-center gap-4">
                <div className="flex-1 text-white pr-8">
                  <h3 className="text-lg font-semibold mb-1">{webtoon.title} :</h3>
                  <p className="text-sm opacity-90 mb-2">{webtoon.authors}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">16 Chap</span>
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full ${i < 4 ? "bg-white" : "bg-white/40"}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 shadow-lg">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <Bell className="w-6 h-6" />
          </button>
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <Search className="w-6 h-6" />
          </button>
          <button className="p-2 text-indigo-600 hover:text-indigo-700 transition-colors">
            <Home className="w-6 h-6" />
          </button>
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <User className="w-6 h-6" />
          </button>
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </nav>
    </div>
  );
}
