export function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  for (const part of document.cookie.split("; ")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index) === name) {
      const value = decodeURIComponent(part.slice(index + 1));
      return value || undefined;
    }
  }
  return undefined;
}

export function setCookie(name: string, value: string, maxAge: number) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax`;
}

export function clearCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0`;
}

// The selected webtoon travels between pages through this cookie
export function rememberWebtoon(id: string) {
  setCookie("webtoon", id, 900);
}
