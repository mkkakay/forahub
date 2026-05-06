import Link from "next/link";

export default function SubmitEventBanner() {
  return (
    <div className="w-full bg-gradient-to-r from-[#0f2a4a] to-[#1a3a5c] py-10 px-6">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white">
            Organizing a global development event?
          </h2>
          <p className="text-sm md:text-base text-white/70 mt-1">
            List it on ForaHub and reach 10,000+ professionals across 194 countries
          </p>
        </div>
        <div className="shrink-0">
          <Link
            href="/events/create"
            className="block w-full md:w-auto bg-white text-[#0f2a4a] rounded-xl px-8 py-3 font-semibold text-base hover:bg-gray-100 transition-colors text-center"
          >
            Submit Your Event
          </Link>
        </div>
      </div>
    </div>
  );
}
