"use client";

import { SubscriptionProvider } from "@/context/SubscriptionContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { AnalyticsConsentProvider } from "@/context/AnalyticsConsentContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <SubscriptionProvider>
          <AnalyticsConsentProvider>{children}</AnalyticsConsentProvider>
        </SubscriptionProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
