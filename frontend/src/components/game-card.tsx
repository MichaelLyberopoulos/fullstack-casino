"use client";

import Image from "next/image";
import { useState } from "react";
import type { Game } from "@/lib/types";

/** Question 1: game tile displaying the thumb.url thumbnail (local fallback for broken images). */
export function GameCard({ game, eager = false }: { game: Game; eager?: boolean }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="group rounded-xl overflow-hidden bg-white/5 border border-white/10 hover:border-amber-400/50 hover:-translate-y-0.5 transition-all">
      <div className="relative aspect-[4/3] bg-black/40">
        <Image
          src={failed ? "/game-fallback.svg" : game.thumbUrl}
          alt={game.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          loading={eager ? "eager" : "lazy"}
          onError={() => setFailed(true)}
        />
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-sm leading-tight truncate" title={game.title}>
          {game.title}
        </h3>
        <p className="mt-1 text-xs text-white/50 truncate">{game.providerName}</p>
      </div>
    </div>
  );
}
