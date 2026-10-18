"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Furniture } from "@/lib/model";
import { favoritesKey, parseFavorites } from "@/lib/catalog-search";
export function useFavorites() {
  const [favorites, setFavorites] = useState<Furniture["kind"][]>([]);
  useEffect(() => {
    const refresh = () => {
      try {
        setFavorites(parseFavorites(localStorage.getItem(favoritesKey)));
      } catch {
        /* Storage may be blocked; favorites still work for this session. */
      }
    };
    refresh();
    const changed = (event: StorageEvent) => {
      if (event.key === favoritesKey || event.key === null) refresh();
    };
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, []);
  const toggleFavorite = (kind: Furniture["kind"]) => {
    const next = favorites.includes(kind)
      ? favorites.filter((k) => k !== kind)
      : [...favorites, kind];
    setFavorites(next);
    try {
      localStorage.setItem(favoritesKey, JSON.stringify(next));
    } catch {
      toast.error(
        "Favorites work for this session, but browser storage could not save them.",
      );
    }
  };
  return { favorites, toggleFavorite };
}
