"use client";

// Sitewide consent state. EVERY component that touches analytics — the
// tracker on event detail, the bookmark button, the registration link
// wrapper — reads from this context and bails when state !== 'granted'.
//
// The context also writes the user's choice through to profiles.analytics_consent
// for signed-in accounts (defence-in-depth: the server-side tracker route
// re-checks against this column before inserting a row).

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  clearSessionIdentifiers,
  clearStoredConsent,
  resolveConsent,
  writeStoredConsent,
  type ConsentState,
} from "@/lib/analytics/consent";

interface Ctx {
  consent: ConsentState;
  /** True iff the gate is satisfied right now. The single helper every
   *  tracker calls — never branch on `consent` directly. */
  allowed: boolean;
  /** "auto_declined" because the browser sent DNT or GPC. Surfaced so the
   *  privacy-preferences UI can explain why the toggle is locked off. */
  browserOptedOut: boolean;
  /** Has the user (or DNT/GPC) made a decision yet? "pending" → banner
   *  shows. */
  hasDecision: boolean;
  grant: () => void;
  decline: () => void;
  /** Wipes the stored choice — useful for "reset privacy" links in tests. */
  reset: () => void;
}

const AnalyticsConsentContext = createContext<Ctx | null>(null);

export function AnalyticsConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<ConsentState>("pending");

  // Pull current state on mount AND every time the tab regains visibility
  // (in case the user changed it in another tab) AND on a custom event
  // emitted from the preferences UI.
  useEffect(() => {
    const sync = () => setConsent(resolveConsent());
    sync();
    const onVisible = () => { if (document.visibilityState === "visible") sync(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("forahub:consent-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("forahub:consent-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const persistServerSide = useCallback(async (granted: boolean) => {
    try {
      const { data: u } = await supabase.auth.getUser();
      const user = u.user;
      if (!user) return;
      await supabase
        .from("profiles")
        .update({
          analytics_consent: granted,
          analytics_consent_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    } catch {
      // Server-side write is best-effort defence-in-depth. The
      // localStorage flag is the primary gate; if Supabase is unreachable
      // we still honour the user's choice locally.
    }
  }, []);

  const grant = useCallback(() => {
    writeStoredConsent("granted");
    setConsent(resolveConsent());
    window.dispatchEvent(new Event("forahub:consent-changed"));
    void persistServerSide(true);
  }, [persistServerSide]);

  const decline = useCallback(() => {
    writeStoredConsent("declined");
    clearSessionIdentifiers();
    setConsent(resolveConsent());
    window.dispatchEvent(new Event("forahub:consent-changed"));
    void persistServerSide(false);
  }, [persistServerSide]);

  const reset = useCallback(() => {
    clearStoredConsent();
    clearSessionIdentifiers();
    setConsent(resolveConsent());
    window.dispatchEvent(new Event("forahub:consent-changed"));
  }, []);

  const value = useMemo<Ctx>(() => ({
    consent,
    allowed: consent === "granted",
    browserOptedOut: consent === "auto_declined",
    hasDecision: consent !== "pending",
    grant,
    decline,
    reset,
  }), [consent, grant, decline, reset]);

  return (
    <AnalyticsConsentContext.Provider value={value}>
      {children}
    </AnalyticsConsentContext.Provider>
  );
}

export function useAnalyticsConsent(): Ctx {
  const ctx = useContext(AnalyticsConsentContext);
  if (!ctx) {
    // Soft-fail safe default: missing provider = treat as declined so a
    // tracker can never accidentally fire because the tree isn't wrapped.
    return {
      consent: "declined",
      allowed: false,
      browserOptedOut: false,
      hasDecision: true,
      grant: () => {},
      decline: () => {},
      reset: () => {},
    };
  }
  return ctx;
}
