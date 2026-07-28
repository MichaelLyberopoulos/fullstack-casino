"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function Header() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        pathname === href
          ? "bg-white/10 text-white"
          : "text-white/60 hover:text-white hover:bg-white/5"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b0e17]/85 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-2">
        <Link href="/" className="mr-2 flex items-center gap-2 shrink-0">
          <span className="text-xl">🎰</span>
          <span className="font-bold tracking-tight hidden sm:inline">
            Good&nbsp;Vibes<span className="text-amber-400">Casino</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {navLink("/", "Games")}
          {navLink("/slot", "Slot Machine")}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {loading ? null : user ? (
            <>
              <span className="hidden sm:inline text-sm text-white/60">{user.username}</span>
              <span className="px-3 py-1.5 rounded-lg bg-amber-400/10 border border-amber-400/30 text-amber-300 text-sm font-semibold tabular-nums">
                {user.balance} 🪙
              </span>
              <button
                onClick={() => {
                  logout();
                  router.push("/");
                }}
                className="px-3 py-1.5 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-amber-400 text-black hover:bg-amber-300 transition-colors"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
