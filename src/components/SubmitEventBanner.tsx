import Link from "next/link";
import { Globe2 } from "lucide-react";

export default function SubmitEventBanner() {
  return (
    <div className="relative w-full bg-gradient-to-r from-[#0f2a4a] to-[#1a3a5c] py-16 px-6 overflow-hidden">
      {/* SDG-coloured glow dots */}
      <span className="absolute top-6 left-8 w-4 h-4 rounded-full opacity-60 blur-sm" style={{ background: "#E5243B", boxShadow: "0 0 12px 4px #E5243B" }} />
      <span className="absolute top-10 right-12 w-3 h-3 rounded-full opacity-50 blur-sm" style={{ background: "#4C9F38", boxShadow: "0 0 10px 3px #4C9F38" }} />
      <span className="absolute bottom-8 left-16 w-3 h-3 rounded-full opacity-50 blur-sm" style={{ background: "#FCC30B", boxShadow: "0 0 10px 3px #FCC30B" }} />
      <span className="absolute bottom-6 right-8 w-4 h-4 rounded-full opacity-60 blur-sm" style={{ background: "#26BDE2", boxShadow: "0 0 12px 4px #26BDE2" }} />

      <div className="max-w-3xl mx-auto flex flex-col items-center text-center gap-5 relative z-10">
        <Globe2 className="text-white/80" size={48} strokeWidth={1.5} />
        <h2 className="text-2xl md:text-3xl font-bold text-white leading-snug">
          Organizing a global development event?
        </h2>
        <p className="text-base text-white/70 max-w-xl">
          Join thousands of development sector professionals who use ForaHub to discover and promote global events. Reach 10,000+ practitioners across 194 countries.
        </p>
        <Link
          href="/events/create"
          className="bg-white text-[#0f2a4a] rounded-2xl px-10 py-4 text-lg font-bold hover:bg-gray-100 transition-colors"
        >
          Submit Your Event
        </Link>
        <Link
          href="/auth/login"
          className="text-white/60 text-sm hover:text-white/90 transition-colors"
        >
          Already listed? Sign in to manage your events
        </Link>
      </div>
    </div>
  );
}
