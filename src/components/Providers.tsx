"use client";

import { SubscriptionProvider } from "@/context/SubscriptionContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SubscriptionProvider>{children}</SubscriptionProvider>;
}
