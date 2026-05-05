import { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About ForaHub",
  description: "ForaHub is the premier platform for global development professionals to discover conferences and events.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="bg-[#0f2a4a] px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl font-extrabold text-white">About ForaHub</h1>
          <p className="text-blue-200 text-lg mt-4">Built for the global development community.</p>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
        <section>
          <h2 className="text-2xl font-bold text-[#0f2a4a] dark:text-white mb-4">What is ForaHub?</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            ForaHub is a comprehensive events platform that aggregates conferences, side events, convenings, and professional gatherings across all 17 UN Sustainable Development Goals. We track events from over 1,000 organisations globally so that development professionals never miss the gatherings that matter most to their work.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-[#0f2a4a] dark:text-white mb-4">Who We Serve</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              "Researchers & Scientists", "Policy Advisors", "Programme Officers",
              "NGO Professionals", "Donors & Funders", "Government Officials",
              "Consultants", "Students & Early Career", "Journalists & Advocates",
            ].map(a => (
              <div key={a} className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-xl p-3 text-sm text-gray-700 dark:text-gray-300 text-center">
                {a}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-[#0f2a4a] dark:text-white mb-4">How It Works</h2>
          <div className="space-y-4">
            {[
              { step: "1", title: "We Aggregate", desc: "Our system continuously monitors 1,000+ organizational websites, RSS feeds, and event directories across all SDG domains." },
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
            <a href="mailto:mo@forahub.org" className="inline-flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              mo@forahub.org
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
