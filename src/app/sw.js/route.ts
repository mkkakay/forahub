// Service worker — served dynamically from this route so we can inject
// a build-time cache key into the CACHE constant. The previous static
// public/sw.js used a hardcoded "forahub-v1" name, which meant a deploy
// that changed the app shell would still serve the old cached HTML to
// returning users until they manually hard-refreshed.
//
// Now: every production build computes a VERSION from
// VERCEL_GIT_COMMIT_SHA (first 8 chars) or, locally, a build-time
// timestamp. The SW activation step drops every cache whose name
// doesn't match — so each deploy gets a clean cache namespace and
// returning users pick up the new shell on next navigation.
//
// Scope: served at /sw.js with `Service-Worker-Allowed: /` so SW
// registration can claim the whole origin. ServiceWorkerRegistration
// still calls register("/sw.js", { scope: "/" }) — no client change.

import { NextResponse } from "next/server";

// Statically evaluated at build time (no runtime data dependency).
export const dynamic = "force-static";

const VERSION =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ??
  `local-${Math.floor(Date.now() / 1000)}`;

const SW_SCRIPT = `
const CACHE = "forahub-${VERSION}";

const APP_SHELL = [
  "/",
  "/events",
  "/pricing",
  "/offline",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;
  if (url.pathname.startsWith("/api/")) return;
  if (!url.hostname.includes("forahub") && url.hostname !== "localhost") return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached;
          if (request.mode === "navigate") return caches.match("/offline");
          return new Response("Offline", {
            status: 503,
            headers: { "Content-Type": "text/plain" },
          });
        })
      )
  );
});
`.trim();

export async function GET(): Promise<NextResponse> {
  return new NextResponse(SW_SCRIPT, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Service-Worker-Allowed": "/",
      // Don't let the SW script itself be cached by browsers — we want
      // them to fetch the latest version on each registration cycle so
      // VERSION rollover takes effect.
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
