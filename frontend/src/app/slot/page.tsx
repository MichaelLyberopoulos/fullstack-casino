"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type {
  ClientConfig,
  ConversionResult,
  Paginated,
  SpinHistoryItem,
  SpinResult,
} from "@/lib/types";
import { Pagination } from "@/components/pagination";

const SYMBOL_EMOJI: Record<string, string> = {
  cherry: "🍒",
  lemon: "🍋",
  apple: "🍎",
  banana: "🍌",
};
const ALL_SYMBOLS = Object.keys(SYMBOL_EMOJI);

// Fallbacks for GET /api/config (Question 3 bet grid, Question 6 currencies),
// used only while the config is loading or unavailable.
const FALLBACK_BET_OPTIONS = Array.from({ length: 10 }, (_, i) => (i + 1) * 0.5);
const FALLBACK_CURRENCIES = ["USD", "GBP", "CHF", "JPY", "CAD", "AUD", "SEK", "NOK", "DKK", "PLN"];

export default function SlotPage() {
  const { user, loading, setBalance } = useAuth();
  const router = useRouter();

  const [bet, setBet] = useState(1.0);
  const [reels, setReels] = useState<string[]>(["cherry", "lemon", "apple"]);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Paginated<SpinHistoryItem> | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [config, setConfig] = useState<ClientConfig | null>(null);

  // Question 6: currency conversion — display only.
  const [currency, setCurrency] = useState("USD");
  const [conversion, setConversion] = useState<ConversionResult | null>(null);
  const [converting, setConverting] = useState(false);

  const spinTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Question 3: the slot machine is only accessible to authenticated users.
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    api.get<ClientConfig>("/config").then(setConfig).catch(() => {});
  }, []);

  const loadHistory = useCallback((page: number) => {
    api
      .get<Paginated<SpinHistoryItem>>(`/spins?page=${page}&limit=10`, { auth: true })
      .then(setHistory)
      .catch(() => {});
  }, []);

  // Keyed on userId (not the user object) so setBalance can't re-fire it.
  const userId = user?.id;
  useEffect(() => {
    if (userId) loadHistory(historyPage);
  }, [userId, historyPage, loadHistory]);

  useEffect(() => () => {
    if (spinTimerRef.current) clearInterval(spinTimerRef.current);
  }, []);

  const spin = async () => {
    if (spinning || !user) return;
    setSpinning(true);
    setResult(null);
    setError(null);
    setConversion(null);

    spinTimerRef.current = setInterval(() => {
      setReels([
        ALL_SYMBOLS[Math.floor(Math.random() * ALL_SYMBOLS.length)],
        ALL_SYMBOLS[Math.floor(Math.random() * ALL_SYMBOLS.length)],
        ALL_SYMBOLS[Math.floor(Math.random() * ALL_SYMBOLS.length)],
      ]);
    }, 90);

    const startedAt = Date.now();
    try {
      const res = await api.post<SpinResult>("/spins", { betAmount: bet }, { auth: true });
      // Let the animation run at least 900 ms so quick responses still feel like a spin.
      const remaining = Math.max(0, 900 - (Date.now() - startedAt));
      await new Promise((r) => setTimeout(r, remaining));

      if (spinTimerRef.current) clearInterval(spinTimerRef.current);
      setReels(res.reelResults);
      setResult(res);
      setBalance(res.balance);
      // setHistoryPage(1) is a no-op on page 1, so fetch directly there;
      // otherwise the [historyPage] effect does the single fetch.
      if (historyPage === 1) loadHistory(1);
      else setHistoryPage(1);
    } catch (e) {
      if (spinTimerRef.current) clearInterval(spinTimerRef.current);
      setError(getErrorMessage(e, "Spin failed. Try again."));
    } finally {
      setSpinning(false);
    }
  };

  const convert = async () => {
    setConverting(true);
    setConversion(null);
    setError(null);
    try {
      const res = await api.get<ConversionResult>(`/currency/convert?to=${currency}`, {
        auth: true,
      });
      setConversion(res);
    } catch (e) {
      setError(getErrorMessage(e, "Conversion failed."));
    } finally {
      setConverting(false);
    }
  };

  if (loading || !user) {
    return <div className="pt-24 text-center text-white/50">Loading…</div>;
  }

  const won = result && parseFloat(result.grossWinnings) > 0;
  const insufficient = parseFloat(user.balance) < bet;
  const betOptions = config?.bet.options ?? FALLBACK_BET_OPTIONS;
  const currencies = config?.currencies ?? FALLBACK_CURRENCIES;

  return (
    <div className="pt-8 grid lg:grid-cols-[1fr_360px] gap-8">
      <div>
        <h1 className="text-2xl font-bold mb-6">Slot Machine</h1>

        <div
          className={`rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-white/[0.03] p-6 sm:p-10 ${
            won && !spinning ? "win-flash" : ""
          }`}
        >
          <div className="flex justify-center gap-3 sm:gap-6">
            {reels.map((symbol, i) => (
              <div
                key={i}
                className={`w-24 h-28 sm:w-32 sm:h-36 rounded-2xl bg-[#0b0e17] border-2 ${
                  won && !spinning ? "border-amber-400" : "border-white/15"
                } flex items-center justify-center text-5xl sm:text-7xl select-none ${
                  spinning ? "reel-spinning" : ""
                }`}
              >
                {SYMBOL_EMOJI[symbol] ?? "❔"}
              </div>
            ))}
          </div>

          <div className="h-14 flex items-center justify-center mt-4">
            {spinning ? (
              <span className="text-white/50 text-sm">Spinning…</span>
            ) : result ? (
              won ? (
                <span className="text-amber-300 font-bold text-lg">
                  🎉 You won {result.grossWinnings} coins! (net {result.netAmount})
                </span>
              ) : (
                <span className="text-white/60">
                  No win this time — net {result.netAmount} coins.
                </span>
              )
            ) : error ? (
              <span className="text-rose-300 text-sm">{error}</span>
            ) : (
              <span className="text-white/40 text-sm">Pick a bet and spin!</span>
            )}
          </div>

          {/* Question 3: bet selector — 0.50 to 5.00 coins in 0.50 increments */}
          <div className="mt-2">
            <p className="text-sm text-white/60 mb-2 text-center">Bet amount (coins)</p>
            <div className="grid grid-cols-5 gap-2 max-w-md mx-auto">
              {betOptions.map((value) => (
                <button
                  key={value}
                  onClick={() => setBet(value)}
                  disabled={spinning}
                  className={`py-2 rounded-lg text-sm font-semibold tabular-nums border transition-colors ${
                    bet === value
                      ? "bg-amber-400 text-black border-amber-400"
                      : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                  }`}
                >
                  {value.toFixed(2)}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={spin}
            disabled={spinning || insufficient}
            className="mt-6 w-full max-w-md mx-auto block rounded-2xl bg-gradient-to-b from-amber-300 to-amber-500 text-black font-extrabold text-lg py-4 hover:from-amber-200 hover:to-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.99]"
          >
            {spinning
              ? "SPINNING…"
              : insufficient
                ? "INSUFFICIENT BALANCE"
                : `SPIN — ${bet.toFixed(2)} 🪙`}
          </button>
        </div>

        {/* Question 6: currency conversion — display only, never changes the stored balance */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="font-semibold mb-1">Balance in another currency</h2>
          <p className="text-xs text-white/40 mb-3">
            Display only — 1 coin = 1 EUR. Your stored balance never changes.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-amber-400/60 [&>option]:bg-[#141a2a]"
            >
              {currencies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              onClick={convert}
              disabled={converting}
              className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-sm font-medium hover:bg-white/15 disabled:opacity-50 transition-colors"
            >
              {converting ? "Converting…" : "Convert"}
            </button>
            {conversion && (
              <span className="text-sm text-emerald-300 font-semibold tabular-nums">
                {conversion.coinBalance} coins ≈ {conversion.convertedBalance}{" "}
                {conversion.targetCurrency}
                <span className="text-white/40 font-normal"> (rate {conversion.rate})</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Question 3: persisted spin history */}
      <aside>
        <h2 className="text-lg font-bold mb-4">Spin history</h2>
        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          {history && history.items.length > 0 ? (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-white/40 text-xs border-b border-white/10">
                    <th className="px-4 py-2.5 font-medium">Reels</th>
                    <th className="px-2 py-2.5 font-medium text-right">Bet</th>
                    <th className="px-2 py-2.5 font-medium text-right">Net</th>
                    <th className="px-4 py-2.5 font-medium text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {history.items.map((s) => {
                    const net = parseFloat(s.netAmount);
                    return (
                      <tr key={s.spinId} className="border-b border-white/5 last:border-0">
                        <td className="px-4 py-2.5">
                          {s.reelResults.map((r) => SYMBOL_EMOJI[r] ?? "❔").join(" ")}
                        </td>
                        <td className="px-2 py-2.5 text-right tabular-nums text-white/60">
                          {s.betAmount}
                        </td>
                        <td
                          className={`px-2 py-2.5 text-right tabular-nums font-semibold ${
                            net > 0 ? "text-emerald-300" : net < 0 ? "text-rose-300" : "text-white/60"
                          }`}
                        >
                          {net > 0 ? `+${s.netAmount}` : s.netAmount}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-white/60">
                          {s.balanceAfter}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <Pagination
                page={historyPage}
                totalPages={history.totalPages}
                onPageChange={setHistoryPage}
                compact
                prevLabel="← Newer"
                nextLabel="Older →"
              />
            </>
          ) : (
            <div className="px-4 py-10 text-center text-white/40 text-sm">
              No spins yet — your history will appear here.
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
