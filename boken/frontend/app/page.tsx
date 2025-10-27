"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Image from "next/image";

interface Webtoon {
  id: number;
  title: string;
  description: string;
}

export default function Home() {
  const [webtoons, setWebtoons] = useState<Webtoon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Credentials à envoyer (tu peux remplacer par un formulaire si tu veux)
  const credentials = {
    email: "a@a.com",
    password: "1234",
  };

  useEffect(() => {
    let isMounted = true;

    async function authenticateAndFetch() {
      setLoading(true);
      setError(null);

      try {
        // 1) Authentification -> obtenir token
        const loginResp = await axios.post(
          "http://127.0.0.1:8000/login/",
          credentials,
          { headers: { "Content-Type": "application/json" } }
        );

        // 2) Récupération du token selon différents formats possibles
        const data = loginResp.data || {};
        const foundToken =
          data.access ||
          (typeof data === "string" ? data : null);
        if (!foundToken) {
          console.error("Login response (no token):", data);
          throw new Error(
            "No token found in login response. Check login endpoint response format."
          );
        }

        // sauvegarde du token en état (et potentiellement localStorage si souhaité)
        if (!isMounted) return;
        setToken(foundToken);

        // 3) Requête protégée aux webtoons en utilisant Authorization Bearer
        const webtoonsResp = await axios.get(
          "http://127.0.0.1:8000/api/webtoons/",
          { headers: { Authorization: `Bearer ${foundToken}` } }
        );

        if (!isMounted) return;

        // 4) Gérer plusieurs formats de réponse (array ou { results: [...] })
        const payload = webtoonsResp.data;
        if (Array.isArray(payload)) {
          setWebtoons(payload);
        } else if (payload && Array.isArray(payload.results)) {
          setWebtoons(payload.results);
        } else {
          // si la structure n'est pas attendue, afficher pour debug
          console.warn("Unexpected webtoons payload:", payload);
          setWebtoons([]);
          setError("Unexpected /api/webtoons/ response format (see console).");
        }
      } catch (err: any) {
        console.error("Auth / fetch error:", err);
        // message d'erreur utile
        if (err.response && err.response.data) {
          setError(
            `Request failed: ${err.response.status} - ${JSON.stringify(
              err.response.data
            )}`
          );
        } else {
          setError(err.message || "Unknown error");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    authenticateAndFetch();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start w-full max-w-3xl">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={180}
          height={38}
          priority
        />

        <h1 className="text-2xl font-bold mt-6 mb-2">Liste des Webtoons</h1>

        {loading && <p>Chargement...</p>}
        {error && <p className="text-red-500 whitespace-pre-wrap">{error}</p>}

        {!loading && !error && webtoons.length === 0 && (
          <p>Aucun webtoon trouvé.</p>
        )}

        {!loading && webtoons.length > 0 && (
          <ul className="w-full space-y-3">
            {webtoons.map((w) => (
              <li
                key={w.id}
                className="p-4 border rounded-2xl shadow-sm hover:bg-gray-50 transition"
              >
                <strong className="block text-lg font-semibold">{w.title}</strong>
                <p className="text-gray-600">{w.description}</p>
              </li>
            ))}
          </ul>
        )}

        {/* Affiche token pour debug (retire en production) */}
        {token && (
          <div className="mt-4 text-xs text-gray-400 break-all w-full">
            <strong>Token (debug):</strong> {token}
          </div>
        )}
      </main>

      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center text-sm text-gray-500">
        <a
          href="https://nextjs.org"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          Powered by Next.js + Django REST
        </a>
      </footer>
    </div>
  );
}
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
            /*{ icon: Search, label: "Recherche" },
            { icon: Bell, label: "Notif" },
            { icon: LogIn, label: "Connexion" },
            { icon: Settings, label: "Option" },*/
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
                background: `linear-gradient(145deg, 15, 30)`,
                border: `1px solid 40`,
              }}
            >
              <div
                className="font-semibold mb-2 text-lg"
                style={{ color: "blue" }}
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
          /*{ icon: Search, label: "Recherche" },
          { icon: Bell, label: "Notif" },
          { icon: LogIn, label: "Connexion" },
          { icon: Settings, label: "Option" },*/
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
  ;
