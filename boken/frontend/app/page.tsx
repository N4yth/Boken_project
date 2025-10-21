"use client";
import { Home, Search, Bell, LogIn, Settings } from "lucide-react";

export default function HomePage() {
  const accent = "oklch(67.3% 0.182 276.935)";

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 relative">
      {/* BARRE SUPÉRIEURE */}
      <header className="w-full bg-white/70 backdrop-blur-md shadow-md flex justify-center sm:justify-end items-center p-3 sticky top-0 z-20">
        <input
          type="text"
          placeholder="Rechercher..."
          className="hidden sm:block border border-gray-300 rounded-full px-4 py-2 w-64 focus:outline-none focus:ring-2"
          style={{
            boxShadow: `0 0 0 2px transparent`,
            transition: "box-shadow 0.2s",
          }}
          onFocus={(e) =>
            (e.target.style.boxShadow = `0 0 0 2px ${accent}`)
          }
          onBlur={(e) => (e.target.style.boxShadow = `0 0 0 2px transparent`)}
        />
      </header>

      {/* CONTENU PRINCIPAL */}
      <main className="flex-1 flex flex-col sm:flex-row overflow-hidden">
        {/* BARRE LATERALE GAUCHE (desktop) */}
        <aside className="hidden sm:flex w-20 bg-white/80 backdrop-blur-md shadow-md flex-col items-center py-6 space-y-8">
          {[
            { icon: Home, label: "Home" },
            { icon: Search, label: "Recherche" },
            { icon: Bell, label: "Notif" },
            { icon: LogIn, label: "Connexion" },
            { icon: Settings, label: "Option" },
          ].map(({ icon: Icon, label }) => (
            <button
              key={label}
              className="flex flex-col items-center text-gray-600 hover:scale-110 hover:text-blue-600 transition-transform duration-200"
            >
              <Icon className="h-6 w-6" />
              <span className="text-xs mt-1">{label}</span>
            </button>
          ))}
        </aside>

        {/* CONTENU CENTRAL (VITRINES) */}
        <section className="flex-1 p-4 sm:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 overflow-auto">
          {[1, 2, 3, 4, 5, 6].map((vitrine) => (
            <button
              key={vitrine}
              className="rounded-2xl p-6 flex flex-col items-center justify-center shadow-md hover:shadow-xl transition transform hover:-translate-y-1 backdrop-blur-lg"
              style={{
                background: `linear-gradient(145deg, ${accent}15, ${accent}30)`,
                border: `1px solid ${accent}40`,
              }}
            >
              <div
                className="font-semibold mb-2 text-lg"
                style={{ color: accent }}
              >
                Vitrine {vitrine}
              </div>
              <p className="text-gray-700 text-sm text-center">
                Une belle vitrine dynamique avec un style moderne et lumineux.
              </p>
            </button>
          ))}
        </section>
      </main>

      {/* BARRE DE NAVIGATION MOBILE */}
      <nav className="sm:hidden fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-md shadow-inner flex justify-around items-center py-2 border-t border-gray-200">
        {[
          { icon: Home, label: "Home" },
          { icon: Search, label: "Recherche" },
          { icon: Bell, label: "Notif" },
          { icon: LogIn, label: "Connexion" },
          { icon: Settings, label: "Option" },
        ].map(({ icon: Icon, label }) => (
          <button
            key={label}
            className="flex flex-col items-center text-gray-600 hover:text-blue-600 transition-colors"
          >
            <Icon className="h-6 w-6" />
            <span className="text-[10px] mt-1">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
<div className="animate-pulse-custom">
  Vitrine avec effet de pulse ✨
</div>
<div className="pulse">Vitrine</div>