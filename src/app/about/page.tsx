import { Metadata } from "next";
import Image from "next/image";
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

const AUDIENCES: {
  label: string;
  Icon: typeof Microscope;
  bg: string;
  iconColor: string;
}[] = [
  { label: "Researchers & Scientists",   Icon: Microscope,     bg: "bg-green-50 dark:bg-green-950/30",   iconColor: "text-green-600 dark:text-green-400" },
  { label: "Policy Advisors",            Icon: FileText,       bg: "bg-blue-50 dark:bg-blue-950/30",     iconColor: "text-blue-600 dark:text-blue-400" },
  { label: "Programme Officers",         Icon: ClipboardList,  bg: "bg-indigo-50 dark:bg-indigo-950/30", iconColor: "text-indigo-600 dark:text-indigo-400" },
  { label: "NGO Professionals",          Icon: Users,          bg: "bg-teal-50 dark:bg-teal-950/30",     iconColor: "text-teal-600 dark:text-teal-400" },
  { label: "Donors & Funders",           Icon: HandCoins,      bg: "bg-amber-50 dark:bg-amber-950/30",   iconColor: "text-amber-600 dark:text-amber-400" },
  { label: "Government Officials",       Icon: Landmark,       bg: "bg-slate-50 dark:bg-slate-800/40",   iconColor: "text-slate-600 dark:text-slate-300" },
  { label: "Consultants",                Icon: Briefcase,      bg: "bg-sky-50 dark:bg-sky-950/30",       iconColor: "text-sky-600 dark:text-sky-400" },
  { label: "Students & Early Career",    Icon: GraduationCap,  bg: "bg-violet-50 dark:bg-violet-950/30", iconColor: "text-violet-600 dark:text-violet-400" },
  { label: "Journalists & Advocates",    Icon: Megaphone,      bg: "bg-rose-50 dark:bg-rose-950/30",     iconColor: "text-rose-600 dark:text-rose-400" },
];

const STATS: { value: string; label: string }[] = [
  { value: "10,000+", label: "Organizations tracked" },
  { value: "17", label: "UN Sustainable Development Goals" },
  { value: "1", label: "Place to find them all" },
];

const TESTIMONIALS: {
  quote: string;
  name: string;
  role: string;
  city: string;
  initials: string;
  avatarBg: string;
}[] = [
  {
    quote: "I used to keep a spreadsheet of twelve different event pages. Now it's one tab. That alone saved me hours every month.",
    name: "Aditya Rahman", role: "Programme Analyst", city: "Jakarta",
    initials: "AR", avatarBg: "bg-blue-500",
  },
  {
    quote: "Good for spotting the big convenings. I'd like to see more regional and francophone events added over time, but it's a solid start.",
    name: "Amelie Toure", role: "Health Financing Consultant", city: "Geneva",
    initials: "AT", avatarBg: "bg-emerald-500",
  },
  {
    quote: "The SDG filters are genuinely useful. I found two side events I would have completely missed otherwise.",
    name: "Thandiwe Mokoena", role: "Research Officer", city: "Maseru",
    initials: "TM", avatarBg: "bg-rose-500",
  },
  {
    quote: "Does what it says. The interface is clean. Coverage of smaller NGO events is still a bit thin, so I check it alongside other sources.",
    name: "Carlos Mendes", role: "M&E Specialist", city: "Lisbon",
    initials: "CM", avatarBg: "bg-amber-500",
  },
  {
    quote: "Finally something built for how we actually work. Tracking deadlines across organizations in one place is exactly what I needed.",
    name: "Fatima Al-Sayed", role: "Partnerships Lead", city: "Amman",
    initials: "FA", avatarBg: "bg-violet-500",
  },
  {
    quote: "A real time saver for conference planning. I've already recommended it to two colleagues in my network.",
    name: "Grace Wanjiru", role: "Policy Advisor", city: "Nairobi",
    initials: "GW", avatarBg: "bg-teal-500",
  },
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

        <section className="bg-blue-50 dark:bg-blue-950/30 rounded-2xl px-6 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STATS.map(({ value, label }) => (
              <div key={label} className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-[#4ea8de] tracking-tight">
                  {value}
                </div>
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-[#0f2a4a] dark:text-white mb-4">Who We Serve</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {AUDIENCES.map(({ label, Icon, bg, iconColor }) => (
              <div
                key={label}
                className={`flex items-center gap-3 ${bg} border border-gray-200 dark:border-[#334155] rounded-xl px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 hover:shadow-md hover:-translate-y-0.5 transition`}
              >
                <Icon size={18} className={`${iconColor} shrink-0`} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-[#0f2a4a] dark:text-white mb-1">What People Are Saying</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">Illustrative feedback from our pre-launch community.</p>
          <div className="about-marquee">
            <div className="about-marquee-track">
              {[0, 1].map(copy =>
                TESTIMONIALS.map(({ quote, name, role, city, initials, avatarBg }) => (
                  <div
                    key={`${copy}-${name}`}
                    aria-hidden={copy === 1 ? true : undefined}
                    className="shrink-0 w-80 min-h-[240px] bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-xl p-5 flex flex-col justify-between"
                  >
                    <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                      &ldquo;{quote}&rdquo;
                    </p>
                    <div className="mt-4 flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full ${avatarBg} text-white text-xs font-semibold flex items-center justify-center shrink-0`}>
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[#0f2a4a] dark:text-white truncate">{name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{role}, {city}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <style>{`
            .about-marquee {
              overflow-x: hidden;
              -webkit-mask-image: linear-gradient(to right, transparent, #000 4%, #000 96%, transparent);
                      mask-image: linear-gradient(to right, transparent, #000 4%, #000 96%, transparent);
            }
            .about-marquee-track {
              display: flex;
              gap: 1.5rem;
              width: max-content;
              animation: about-marquee-scroll 50s linear infinite;
              will-change: transform;
            }
            .about-marquee:hover .about-marquee-track {
              animation-play-state: paused;
            }
            @keyframes about-marquee-scroll {
              0%   { transform: translate3d(0, 0, 0); }
              100% { transform: translate3d(-50%, 0, 0); }
            }
            @media (prefers-reduced-motion: reduce) {
              .about-marquee { overflow-x: auto; -webkit-mask-image: none; mask-image: none; }
              .about-marquee-track { animation: none; }
            }
          `}</style>
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

        <section className="relative h-64 w-full overflow-hidden rounded-2xl">
          <Image
            src="https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=2000&q=80"
            alt="Audience raising hands at a global conference convening."
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
            priority={false}
          />
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
