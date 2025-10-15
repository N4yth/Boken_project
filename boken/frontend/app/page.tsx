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
