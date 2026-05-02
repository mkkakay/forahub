"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";

export type SubscriptionTier = "free" | "pro" | "founding";

export interface SubscriptionInfo {
  tier: SubscriptionTier;
  isOnTrial: boolean;
  hasFullAccess: boolean;
  isLoading: boolean;
  userId: string | null;
  userEmail: string | null;
}

const defaultInfo: SubscriptionInfo = {
  tier: "free",
  isOnTrial: false,
  hasFullAccess: false,
  isLoading: true,
  userId: null,
  userEmail: null,
};

const SubscriptionContext = createContext<SubscriptionInfo>(defaultInfo);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [info, setInfo] = useState<SubscriptionInfo>(defaultInfo);

  const loadProfile = useCallback(async (userId: string, userEmail: string | null) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier, trial_end_date")
      .eq("id", userId)
      .maybeSingle();

    const now = new Date();
    const tier = (profile?.subscription_tier ?? "free") as SubscriptionTier;
    const isOnTrial = profile?.trial_end_date
      ? new Date(profile.trial_end_date) > now
      : false;
    const hasFullAccess = tier !== "free" || isOnTrial;

    setInfo({ tier, isOnTrial, hasFullAccess, isLoading: false, userId, userEmail });
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadProfile(session.user.id, session.user.email ?? null);
      } else {
        setInfo({ ...defaultInfo, isLoading: false });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadProfile(session.user.id, session.user.email ?? null);
      } else {
        setInfo({ ...defaultInfo, isLoading: false });
      }
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  return (
    <SubscriptionContext.Provider value={info}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
