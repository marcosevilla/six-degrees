// TMDb search is fuzzy and we merge movies with TV, so sorting by popularity
// alone buries the exact title the player typed (The Family, 2013, sits under
// All in the Family and The Addams Family). Rank what they typed first.
const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/^the\s+/, "")
    .replace(/\s+/g, " ")
    .trim();

export function rankByMatch<T extends { title: string; popularity: number }>(query: string, items: T[]): T[] {
  const q = normalize(query);
  const tier = (title: string) => {
    const t = normalize(title);
    if (t === q) return 0;
    if (t.startsWith(q)) return 1;
    return 2;
  };
  return [...items].sort((a, b) => tier(a.title) - tier(b.title) || b.popularity - a.popularity);
}
