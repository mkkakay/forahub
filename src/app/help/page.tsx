import { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

export const metadata: Metadata = {
  title: "Help Center",
  description: "Get help with using ForaHub.",
};

const FAQS = [
  { q: "What is ForaHub?", a: "ForaHub is a platform that aggregates conferences, side events, and professional gatherings across all 17 UN Sustainable Development Goals. We track 1,000+ events globally so global development professionals never miss important convenings." },
  { q: "Is ForaHub free to use?", a: "Yes! ForaHub has a free tier that gives you access to all upcoming events. Pro subscribers get additional features like unlimited keyword alerts, access to events beyond 30 days, and AI assistant priority access." },
  { q: "How do I sign up?", a: "Click 'Get Started' in the navigation bar. You can sign up with your email and password, or use Google or Apple sign-in for a one-click experience." },
  { q: "How do I upgrade to Pro?", a: "Visit the Pricing page and select a plan. We accept all major credit cards via Stripe. Your subscription begins immediately." },
  { q: "How do keyword alerts work?", a: "Go to Alerts in your account. Add keywords like 'health financing' or 'climate adaptation'. We'll notify you by email when new matching events are added to our database." },
  { q: "Can I submit an event?", a: "Yes! Click 'Submit Event' in the navigation. We review all submissions and publish qualifying events within 48 hours. Organizers can also contact us at mo@forahub.org." },
  { q: "Where does your event data come from?", a: "We aggregate publicly available event information from organizational websites, RSS feeds, UN agency calendars, and official event directories. See our Data Sources page for more details." },
  { q: "How do I report an error in an event listing?", a: "Use our Contact page and select 'Report Event Error'. Include the event name and what needs to be corrected. We aim to update listings within 24 hours." },
  { q: "Is my data secure?", a: "Yes. We use industry-standard encryption, secure authentication through Supabase, and never sell your personal data. See our Privacy Policy for full details." },
  { q: "How do I delete my account?", a: "Go to Profile settings and scroll to the 'Danger Zone' section. Click 'Delete my account' and confirm. All your data will be permanently deleted within 30 days." },
];

export default function HelpPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="bg-[#0f2a4a] px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl font-extrabold text-white">Help Center</h1>
          <p className="text-blue-200 text-sm mt-2">Find answers to common questions.</p>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h2 className="text-xl font-bold text-[#0f2a4a] dark:text-white mb-6">Frequently Asked Questions</h2>
        <div className="space-y-3 mb-10">
          {FAQS.map(({ q, a }) => (
            <details key={q} className="group bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-xl p-4">
              <summary className="flex items-center justify-between cursor-pointer font-semibold text-sm text-[#0f2a4a] dark:text-white list-none">
                {q}
                <ChevronDown size={16} className="text-gray-400 group-open:rotate-180 transition-transform" />
              </summary>
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{a}</p>
            </details>
          ))}
        </div>

        <div className="bg-[#0f2a4a] rounded-xl p-6 text-center">
          <h2 className="text-lg font-bold text-white mb-2">Still need help?</h2>
          <p className="text-blue-200 text-sm mb-4">Our team is here for you.</p>
          <Link href="/contact" className="inline-flex items-center gap-2 bg-[#4ea8de] text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-[#3a95cc] transition-colors">
            Contact Support
          </Link>
        </div>
      </main>
    </div>
  );
}
