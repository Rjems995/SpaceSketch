import { catalog, kinds, type Furniture } from "./model";
export const favoritesKey = "spacesketch-favorites-v1";
export function parseFavorites(raw: string | null): Furniture["kind"][] {
  try {
    const value: unknown = JSON.parse(raw ?? "[]");
    return Array.isArray(value)
      ? [
          ...new Set(
            value.filter((v): v is Furniture["kind"] => kinds.includes(v)),
          ),
        ]
      : [];
  } catch {
    return [];
  }
}
export function searchCatalog(
  query: string,
  category: string,
  favorites: Furniture["kind"][],
  favoritesOnly: boolean,
) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return catalog.filter(
    (c) =>
      (category === "All" || c.category === category) &&
      (!favoritesOnly || favorites.includes(c.kind)) &&
      terms.every((term) =>
        `${c.name} ${c.kind} ${c.category}`.toLowerCase().includes(term),
      ),
  );
}
