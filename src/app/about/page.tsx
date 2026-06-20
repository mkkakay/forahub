import { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { getPageBanner } from "@/lib/pageBanners";
import {
  Microscope, FileText, ClipboardList, Users, HandCoins,
  Landmark, Briefcase, GraduationCap, Megaphone,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About ForaHub",
  description: "ForaHub is the premier platform for global development professionals to discover conferences and events.",
};

const AUDIENCES: { label: string; Icon: typeof Microscope }[] = [
  { label: "Researchers & Scientists", Icon: Microscope },
  { label: "Policy Advisors", Icon: FileText },
  { label: "Programme Officers", Icon: ClipboardList },
  { label: "NGO Professionals", Icon: Users },
  { label: "Donors & Funders", Icon: HandCoins },
  { label: "Government Officials", Icon: Landmark },
  { label: "Consultants", Icon: Briefcase },
  { label: "Students & Early Career", Icon: GraduationCap },
  { label: "Journalists & Advocates", Icon: Megaphone },
];

const STATS: { value: string; label: string }[] = [
  { value: "10,000+", label: "Organizations tracked" },
  { value: "17", label: "UN Sustainable Development Goals" },
  { value: "1", label: "Place to find them all" },
];

export default async function AboutPage() {
  const banner = await getPageBanner("about").catch(() => null);
  return (
    <div className="min-h-screen">
      <Navbar />
      <PageHeader
        pageKey="about"
        title="About ForaHub"
        subtitle="Built for the global development community."
        banner={banner}
      />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
        <section>
          <h2 className="text-2xl font-bold text-[#0f2a4a] dark:text-white mb-4">What is ForaHub?</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            ForaHub is a comprehensive events platform that aggregates conferences, side events, convenings, and professional gatherings across all 17 UN Sustainable Development Goals. We track events from over 10,000 organisations globally so that development professionals never miss the gatherings that matter most to their work.
          </p>
          <p className="mt-4 text-lg font-medium text-[#0f2a4a] dark:text-gray-100 leading-relaxed">
            ForaHub exists because finding the right event shouldn&apos;t mean combing through dozens of separate websites. We built one place to discover them all, so your next conference, side event, or convening is a single search away.
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-y border-gray-200 dark:border-[#334155]">
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-[#4ea8de] tracking-tight">
                {value}
              </div>
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {label}
              </div>
            </div>
          ))}
        </section>

        <section>
          <h2 className="text-2xl font-bold text-[#0f2a4a] dark:text-white mb-4">Who We Serve</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {AUDIENCES.map(({ label, Icon }) => (
              <div
                key={label}
                className="flex items-center gap-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-xl px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 hover:shadow-md hover:-translate-y-0.5 transition"
              >
                <Icon size={18} className="text-[#4ea8de] shrink-0" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-[#0f2a4a] dark:text-white mb-4">How It Works</h2>
          <div className="space-y-4">
            {[
              { step: "1", title: "We Aggregate", desc: "Our system continuously monitors 10,000+ organizational websites, RSS feeds, and event directories across all SDG domains." },
              { step: "2", title: "We Curate", desc: "Every event is reviewed, tagged with SDG goals, region, format, and key deadlines. Our AI helps classify and enrich event data." },
              { step: "3", title: "You Discover", desc: "Search, filter, save, and get personalized recommendations. Never miss a registration deadline or travel grant opportunity." },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-[#4ea8de] text-white font-bold flex items-center justify-center shrink-0 text-sm">{step}</div>
                <div>
                  <h3 className="font-semibold text-[#0f2a4a] dark:text-white">{title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-gray-50 dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-[#334155] p-6">
          <h2 className="text-xl font-bold text-[#0f2a4a] dark:text-white mb-2">Get in Touch</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">We&apos;d love to hear from you — whether you want to add your organization&apos;s events, report an issue, or explore a partnership.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/contact" className="inline-flex items-center justify-center gap-2 bg-[#4ea8de] text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-[#3a95cc] transition-colors">
              Contact Us
            </Link>
            <a href="mailto:admin@forahub.org" className="inline-flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              admin@forahub.org
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
