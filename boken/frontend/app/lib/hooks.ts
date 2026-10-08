"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "./api";
import { rememberWebtoon } from "./cookies";
import { useAuth } from "@/utils/userAuth";
import { useFeedback } from "@/components/feedback";

// Reveals a long list in pages as the sentinel scrolls into view
export function usePaged<T>(items: T[], pageSize = 20) {
  const [count, setCount] = useState(pageSize);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => setCount(pageSize), [items, pageSize]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || count >= items.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setCount((c) => c + pageSize);
      },
      { rootMargin: "400px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [count, items.length, pageSize]);

  return { visible: items.slice(0, count), sentinel, hasMore: count < items.length };
}

export function useAddToLibrary(onAdded?: (webtoonId: string) => void) {
  const { isLogged } = useAuth();
  const { toast } = useFeedback();
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  const add = useCallback(
    async (webtoonId: string, releaseId: string, totalChapter = 0) => {
      if (!isLogged) {
        toast("Sign in to start your library");
        router.push("/login");
        return false;
      }
      setPending(releaseId);
      try {
        await api("/api/usereleases/", {
          method: "POST",
          body: {
            release_id: releaseId,
            chapter_read: 0,
            personal_total_chapter: totalChapter,
            note: "",
            rating: 0,
            reading_status: "to read",
          },
        });
        onAdded?.(webtoonId);
        toast("Added to your library", "success");
        return true;
      } catch (err) {
        console.error("Failed to add to library:", err);
        toast("Could not add it, it may already be in your library", "error");
        return false;
      } finally {
        setPending(null);
      }
    },
    [isLogged, onAdded, router, toast]
  );

  return { add, pending };
}

export function useOpenWebtoon(path = "/display_webtoon") {
  const router = useRouter();
  return useCallback(
    (id: string) => {
      rememberWebtoon(id);
      router.push(path);
    },
    [router, path]
  );
}
