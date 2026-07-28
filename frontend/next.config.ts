import type { NextConfig } from "next";

// Origin of the backend API — needed in the CSP connect-src directive.
//
// NEXT_PUBLIC_API_URL is inlined into the client bundle at BUILD time, so this
// CSP must be derived from the same build-time value. Changing the API URL
// requires a rebuild — see README "Deployment notes".
if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_API_URL) {
  console.warn(
    "[next.config] NEXT_PUBLIC_API_URL is not set — connect-src will fall back to " +
      "http://localhost:4000 and the deployed app's API calls will be blocked by CSP.",
  );
}
const apiOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").origin;
  } catch {
    return "http://localhost:4000";
  }
})();

const nextConfig: NextConfig = {
  images: {
    // [Question 4 — Security] Only the exact casino asset host may be
    // optimized/served — never arbitrary user-supplied hosts.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "assets-sandbox.goodvibescasino.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            // [Question 4 — Security] Restrictive CSP: the JWT is JS-accessible
            // (localStorage), so we tightly limit where scripts can load from and
            // where data can go. 'unsafe-inline'/'unsafe-eval' are required by
            // Next.js hydration/dev.
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' blob: data: https://assets-sandbox.goodvibescasino.com",
              "font-src 'self'",
              `connect-src 'self' ${apiOrigin}`,
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
