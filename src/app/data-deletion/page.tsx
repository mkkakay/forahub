import { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import { getPageBanner } from "@/lib/pageBanners";
import AnalyticsDeleteAction from "@/components/AnalyticsDeleteAction";

export const metadata: Metadata = {
  title: "Data Deletion Instructions",
  description:
    "How to request deletion of your ForaHub account and associated data.",
};

export default async function DataDeletionPage() {
  const banner = await getPageBanner("data-deletion").catch(() => null);

  const sections = [
    {
      title: "1. Option A — Delete from your Profile",
      content:
        "If you can sign in, the fastest way is the self-serve option. Go to your Profile page, scroll to the danger zone, and click \"Yes, delete my account\". This is immediate and irreversible. All personal data described below is removed.",
    },
    {
      title: "2. Option B — Email request",
      content:
        "If you can no longer sign in, signed up via Google / Microsoft / Facebook and prefer a manual deletion, or want a written confirmation, email admin@forahub.org from the address registered on your account with the subject line \"Delete my ForaHub account\". We will verify the request belongs to the account holder before processing.",
    },
    {
      title: "3. What gets deleted",
      content:
        "Your account record (email, name, profile fields, organization, SDG interests), your saved-events list, any event submissions you made while signed in, your notification preferences, and the link between your ForaHub account and any third-party sign-in provider (Google, Microsoft, Facebook). The third-party providers themselves still hold their own copy of your identity — to remove that, you must contact them directly.",
    },
    {
      title: "4. What is not deleted",
      content:
        "Publicly aggregated event metadata sourced from third-party organizations is not personal data and is unaffected. Anonymized, aggregated usage statistics that can no longer be tied to you may be retained. Where the law (for example tax or anti-fraud obligations on a past Stripe payment) requires us to keep a minimum record, we keep only what the law requires and nothing more.",
    },
    {
      title: "5. Timeframe",
      content:
        "Self-serve deletions from the Profile page are immediate. Email-requested deletions are processed within 30 days of verification, in line with our Privacy Policy. We will send a confirmation email when the deletion is complete.",
    },
    {
      title: "6. Facebook Login users",
      content:
        "If you signed in with Facebook and want only the Facebook link removed — not the whole ForaHub account — email admin@forahub.org and ask us to unlink the Facebook identity. You will then need to sign in with email/password or another provider going forward.",
    },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <PageHeader
        pageKey="data-deletion"
        title="Data Deletion Instructions"
        subtitle="How to remove your ForaHub account and personal data"
        banner={banner}
      />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          You can request deletion of your ForaHub account and the personal data
          we hold about you at any time, free of charge. See also our{" "}
          <Link href="/privacy" className="text-[#4ea8de] hover:underline">
            Privacy Policy
          </Link>{" "}
          for the full data-handling commitment.
        </p>
        {sections.map(({ title, content }) => (
          <section key={title}>
            <h2 className="text-lg font-bold text-[#0f2a4a] dark:text-white mb-2">
              {title}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm">
              {content}
            </p>
          </section>
        ))}

        <section id="analytics">
          <h2 className="text-lg font-bold text-[#0f2a4a] dark:text-white mb-2">
            7. Analytics logs
          </h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm mb-3">
            If you previously opted in to event analytics, you can erase every analytics row recorded under your account immediately — without deleting your whole ForaHub account. The button below scopes the delete to your <code>user_id</code> server-side and is irreversible.
          </p>
          <AnalyticsDeleteAction />
          <p className="text-xs text-gray-500 mt-3">
            Raw analytics rows also auto-delete after 14 months. To stop new logs from being recorded going forward, visit{" "}
            <Link href="/profile#privacy" className="text-[#4ea8de] hover:underline">Profile &rarr; Privacy preferences</Link>.
          </p>
        </section>
        <p className="text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-slate-700 pt-6">
          Questions about a deletion request? Email{" "}
          <a
            href="mailto:admin@forahub.org"
            className="text-[#4ea8de] hover:underline"
          >
            admin@forahub.org
          </a>
          .
        </p>
      </main>
    </div>
  );
}
