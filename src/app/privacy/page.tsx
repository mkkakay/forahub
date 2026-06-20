import { Metadata } from "next";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import { getPageBanner } from "@/lib/pageBanners";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "ForaHub Privacy Policy — GDPR & CCPA compliant",
};

export default async function PrivacyPage() {
  const banner = await getPageBanner("privacy").catch(() => null);
  return (
    <div className="min-h-screen">
      <Navbar />
      <PageHeader
        pageKey="privacy"
        title="Privacy Policy"
        subtitle="Last updated: January 2026 · GDPR & CCPA compliant"
        banner={banner}
      />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-[#0f2a4a] dark:text-white mb-2">1. Information We Collect</h2>
          <p className="mb-2"><strong>Account Information:</strong> When you register, we collect your email address and create a profile.</p>
          <p className="mb-2"><strong>Usage Data:</strong> We collect information about how you interact with the Service, including events you view, save, and search for.</p>
          <p className="mb-2"><strong>Profile Data:</strong> Information you voluntarily provide such as your name, organization, job title, and SDG interests.</p>
          <p><strong>Technical Data:</strong> IP address, browser type, device information, and cookies (with your consent).</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-[#0f2a4a] dark:text-white mb-2">2. How We Use Your Information</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>To provide and improve the Service</li>
            <li>To personalize your event recommendations</li>
            <li>To send event reminders and alerts you have opted into</li>
            <li>To process your subscription payments</li>
            <li>To communicate with you about the Service</li>
            <li>To comply with legal obligations</li>
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-bold text-[#0f2a4a] dark:text-white mb-2">3. Sharing Your Information</h2>
          <p>We do not sell your personal data. We may share data with:</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li><strong>Service Providers:</strong> Supabase (database), Stripe (payments), Resend (email). Each subject to data processing agreements.</li>
            <li><strong>Legal Requirements:</strong> When required by law or to protect our rights.</li>
          </ul>
        </section>
        <section id="cookies">
          <h2 className="text-lg font-bold text-[#0f2a4a] dark:text-white mb-2">4. Cookies</h2>
          <p>We use essential cookies for authentication and functionality. With your consent, we use analytics cookies to improve the Service. You can manage cookie preferences via our consent banner. Declining non-essential cookies will not affect core functionality.</p>
        </section>

        <section id="analytics">
          <h2 className="text-lg font-bold text-[#0f2a4a] dark:text-white mb-2">4a. Event Analytics</h2>
          <p className="mb-2">
            <strong>What we log.</strong> If — and only if — you opt in via the consent banner or your profile settings, we record three actions on individual events: <em>view</em> (when you open an event page), <em>save</em> / <em>unsave</em> (when you bookmark or remove a bookmark), and <em>registration click</em> (when you click the &ldquo;Register&rdquo; link to the external site). For each action we store: which event, which series (if any), the action name, your account identifier or a short-lived per-tab anonymous identifier, the referring site&apos;s host (not the full URL), and the timestamp.
          </p>
          <p className="mb-2">
            <strong>What we do NOT log.</strong> No IP address. No precise location. No browser fingerprint. No cross-site tracking. No durable anonymous identifier — the anonymous id is generated per browser tab in <code>sessionStorage</code> and is destroyed when the tab closes.
          </p>
          <p className="mb-2">
            <strong>Lawful basis.</strong> Consent (Art. 6(1)(a) GDPR). Logging is off until you explicitly opt in. If your browser sends a Do-Not-Track or Global Privacy Control signal, we treat that as an opt-out automatically and the in-app toggle is locked off.
          </p>
          <p className="mb-2">
            <strong>Retention.</strong> Raw analytics rows are auto-deleted after 14 months. You can also request immediate deletion of all your analytics rows at any time via{" "}
            <a href="/data-deletion#analytics" className="text-[#4ea8de] hover:underline">Data deletion &rarr; Analytics logs</a>.
          </p>
          <p className="mb-2">
            <strong>Who can see what.</strong> Organization managers can see <em>aggregate</em> counts (views, saves, registration clicks) and a daily trend for their own org&apos;s events. They cannot see who viewed or saved any individual event &mdash; the dashboard query explicitly excludes user identifiers, and we never expose them to the client.
          </p>
          <p className="mb-2">
            <strong>Your rights.</strong> Access, export, and erasure of analytics data. Change your consent any time at{" "}
            <a href="/profile#privacy" className="text-[#4ea8de] hover:underline">Profile &rarr; Privacy preferences</a>.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-[#0f2a4a] dark:text-white mb-2">5. Your Rights</h2>
          <p>Under GDPR and CCPA, you have the right to:</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data (&ldquo;right to be forgotten&rdquo;)</li>
            <li>Object to processing or request restriction</li>
            <li>Data portability</li>
            <li>Opt out of the sale of personal information (we do not sell data)</li>
          </ul>
          <p className="mt-2">To exercise these rights, contact <a href="mailto:admin@forahub.org" className="text-[#4ea8de] hover:underline">admin@forahub.org</a>.</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-[#0f2a4a] dark:text-white mb-2">6. Data Retention</h2>
          <p>We retain your account data for as long as your account is active. You may delete your account at any time from your Profile settings, which removes all personal data within 30 days.</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-[#0f2a4a] dark:text-white mb-2">7. Event Data Sourcing</h2>
          <p>ForaHub aggregates publicly available event information from organizational websites, press releases, and official event directories. We respect the public nature of this information. If you are an organization and wish to update or remove your event listing, contact us at <a href="mailto:admin@forahub.org" className="text-[#4ea8de] hover:underline">admin@forahub.org</a>.</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-[#0f2a4a] dark:text-white mb-2">8. Security</h2>
          <p>We implement industry-standard security measures including encrypted data transmission (TLS), secure authentication, and limited access controls. No method of transmission over the Internet is 100% secure.</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-[#0f2a4a] dark:text-white mb-2">9. Contact</h2>
          <p>For privacy questions, contact our data controller at <a href="mailto:admin@forahub.org" className="text-[#4ea8de] hover:underline">admin@forahub.org</a>.</p>
        </section>
      </main>
    </div>
  );
}
