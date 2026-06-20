// Client-side consent gate. The ONLY place that returns "may log" is
// `isAnalyticsAllowed()` — every tracker calls it first. If you add a new
// signal (consent revocation event, header, etc.), wire it through here
// so there's no path that bypasses the gate.

import { CONSENT_LOCAL_STORAGE_KEY, ANON_ID_KEY } from "./constants";

export type ConsentState = "pending" | "granted" | "declined" | "auto_declined";

interface StoredConsent {
  state: "granted" | "declined";
  /** ms since epoch */
  at: number;
}

/** True iff the browser claims DNT or GPC. Either signal counts as an
 *  active opt-out and shortcuts the banner. */
export function browserOptedOut(): boolean {
  if (typeof window === "undefined") return false;
  try {
    // Sec-GPC (Global Privacy Control) — preferred modern signal.
    const gpc = (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl;
    if (gpc === true) return true;
  } catch { /* navigator not available */ }
  try {
    // DNT — older. "1" = opted out.
    const dnt = (navigator as Navigator & { doNotTrack?: string }).doNotTrack
      ?? (window as Window & { doNotTrack?: string }).doNotTrack
      ?? (document as Document & { doNotTrack?: string }).doNotTrack;
    if (dnt === "1" || dnt === "yes") return true;
  } catch { /* same */ }
  return false;
}

export function readStoredConsent(): StoredConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_LOCAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredConsent>;
    if (parsed.state !== "granted" && parsed.state !== "declined") return null;
    if (typeof parsed.at !== "number") return null;
    return { state: parsed.state, at: parsed.at };
  } catch { return null; }
}

export function writeStoredConsent(state: "granted" | "declined"): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      CONSENT_LOCAL_STORAGE_KEY,
      JSON.stringify({ state, at: Date.now() } satisfies StoredConsent),
    );
  } catch { /* private mode */ }
}

export function clearStoredConsent(): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(CONSENT_LOCAL_STORAGE_KEY); } catch {}
}

/** Resolve the current consent state, taking browser opt-out into account.
 *  Order:
 *    1. DNT/GPC → auto_declined (overrides any stored choice).
 *    2. Stored "granted" → granted.
 *    3. Stored "declined" → declined.
 *    4. No record → pending.
 */
export function resolveConsent(): ConsentState {
  if (browserOptedOut()) return "auto_declined";
  const stored = readStoredConsent();
  if (!stored) return "pending";
  return stored.state;
}

/** The gate. Any caller that logs a user-linked event must check this and
 *  bail on `false`. Defence-in-depth: the server-side route ALSO checks
 *  before inserting, so a client bypass still hits a wall. */
export function isAnalyticsAllowed(): boolean {
  return resolveConsent() === "granted";
}

/** Rotating per-tab anonymous id. Generated only on first use after
 *  consent. ~96 bits of entropy from crypto.getRandomValues — explicitly
 *  not a derivation from IP/UA/canvas/anything. Session-storage scoped so
 *  it dies when the tab closes; a new tab generates a fresh id, which is
 *  the point. */
export function getOrCreateAnonymousId(): string | null {
  if (!isAnalyticsAllowed()) return null;
  if (typeof window === "undefined") return null;
  try {
    const existing = window.sessionStorage.getItem(ANON_ID_KEY);
    if (existing) return existing;
    const bytes = new Uint8Array(12);
    window.crypto.getRandomValues(bytes);
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    const id = btoa(bin)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    window.sessionStorage.setItem(ANON_ID_KEY, id);
    return id;
  } catch { return null; }
}

/** Clears any session-scoped tracking identifiers. Called when the user
 *  revokes consent so the in-tab state matches their new choice. */
export function clearSessionIdentifiers(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(ANON_ID_KEY);
    // Drop view-dedupe keys too, so a re-grant of consent in the same tab
    // doesn't suppress the first view (which would silently undercount).
    for (let i = window.sessionStorage.length - 1; i >= 0; i--) {
      const k = window.sessionStorage.key(i);
      if (k && k.startsWith("forahub-analytics-viewed-")) {
        window.sessionStorage.removeItem(k);
      }
    }
  } catch {}
}
