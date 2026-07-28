"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { Game, Paginated } from "@/lib/types";
import { INPUT_CLASS } from "@/lib/ui";
import { GameCard } from "@/components/game-card";
import { Pagination } from "@/components/pagination";

const PAGE_SIZE = 24;
const DEBOUNCE_MS = 400;

/**
 * Question 1 — game listing (served by the backend REST API).
 * Question 2 — search-as-you-type against the dedicated backend endpoint.
 * Question 5 — client side of the optimization story:
 *   - keystrokes are debounced (400 ms) so we don't fire a request per key;
 *   - each new request aborts the in-flight one (AbortController), so a slow
 *     stale response can never overwrite newer results;
 *   - results are paginated, never unbounded.
 */
export default function GamesPage() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<Game> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchGames = useCallback((q: string, p: number) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    const path = q
      ? `/games/search?q=${encodeURIComponent(q)}&page=${p}&limit=${PAGE_SIZE}`
      : `/games?page=${p}&limit=${PAGE_SIZE}`;

    api
      .get<Paginated<Game>>(path, { signal: controller.signal })
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if ((e as Error).name === "AbortError") return; // superseded by a newer request
        setError("Could not load games. Is the API running?");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchGames(query.trim(), page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Question 5: explicit pagination cancels a pending debounced search reset.
  const goToPage = (p: number) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setPage(p);
  };

  // Question 5: search is debounced and resets to page 1 (fetching directly
  // when already there, since setPage(1) would be a no-op for the effect).
  const onQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (page === 1) fetchGames(value.trim(), 1);
      else setPage(1);
    }, DEBOUNCE_MS);
  };

  return (
    <div className="pt-8">
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Game Lobby</h1>
          <p className="text-sm text-white/50 mt-1">
            {data ? `${data.total} games` : "Loading…"}
          </p>
        </div>
        <div className="sm:ml-auto w-full sm:w-80">
          <label htmlFor="game-search" className="sr-only">
            Search games
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">🔍</span>
            <input
              id="game-search"
              type="search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search by title or provider…"
              maxLength={100}
              className={`${INPUT_CLASS} pl-9 pr-4`}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 px-4 py-3 text-sm mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="rounded-xl overflow-hidden bg-white/5 border border-white/10">
              <div className="aspect-[4/3] bg-white/5 animate-pulse" />
              <div className="p-3 space-y-2">
                <div className="h-3.5 w-3/4 bg-white/10 rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-white/5 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : data && data.items.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {data.items.map((game, i) => (
              <GameCard key={game.id} game={game} eager={i < 4} />
            ))}
          </div>

          <Pagination page={page} totalPages={data.totalPages} onPageChange={goToPage} />
        </>
      ) : (
        <div className="text-center py-20 text-white/50">
          <div className="text-4xl mb-3">🃏</div>
          <p>No games match “{query}”.</p>
        </div>
      )}
    </div>
  );
}
