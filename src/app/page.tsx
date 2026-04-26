import { Search, MapPin, Calendar, Building2, Tag } from "lucide-react";

const SAMPLE_EVENTS = [
  {
    id: 1,
    title: "UN High-Level Political Forum on Sustainable Development",
    date: "July 14–23, 2025",
    location: "New York, USA",
    organization: "United Nations DESA",
    sdgTag: "SDG 17 — Partnerships",
    sdgColor: "bg-blue-100 text-blue-800",
  },
  {
    id: 2,
    title: "World Water Forum 2025",
    date: "June 2–5, 2025",
    location: "Bali, Indonesia",
    organization: "World Water Council",
    sdgTag: "SDG 6 — Clean Water",
    sdgColor: "bg-cyan-100 text-cyan-800",
  },
  {
    id: 3,
    title: "Global Food Security Summit",
    date: "September 10–12, 2025",
    location: "Rome, Italy",
    organization: "FAO / WFP",
    sdgTag: "SDG 2 — Zero Hunger",
    sdgColor: "bg-yellow-100 text-yellow-800",
  },
  {
    id: 4,
    title: "COP30 Climate Conference",
    date: "November 10–21, 2025",
    location: "Belém, Brazil",
    organization: "UNFCCC",
    sdgTag: "SDG 13 — Climate Action",
    sdgColor: "bg-green-100 text-green-800",
  },
  {
    id: 5,
    title: "International Conference on Financing for Development",
    date: "June 30–July 3, 2025",
    location: "Seville, Spain",
    organization: "UN / World Bank",
    sdgTag: "SDG 10 — Reduced Inequalities",
    sdgColor: "bg-pink-100 text-pink-800",
  },
  {
    id: 6,
    title: "Global Refugee Forum Side Events",
    date: "October 15–16, 2025",
    location: "Geneva, Switzerland",
    organization: "UNHCR",
    sdgTag: "SDG 16 — Peace & Justice",
    sdgColor: "bg-purple-100 text-purple-800",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Navigation */}
      <nav className="bg-[#0f2a4a] sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <span className="text-white text-xl font-bold tracking-tight">
              Fora<span className="text-[#4ea8de]">Hub</span>
            </span>
            <div className="flex items-center gap-3">
              <button className="text-gray-300 hover:text-white text-sm font-medium px-4 py-2 rounded-md transition-colors">
                Sign In
              </button>
              <button className="bg-[#4ea8de] hover:bg-[#3a95cc] text-white text-sm font-semibold px-4 py-2 rounded-md transition-colors">
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-[#0f2a4a] pb-20 pt-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight tracking-tight">
            Never Miss a Global Development Event
          </h1>
          <p className="mt-5 text-lg sm:text-xl text-blue-200 max-w-2xl mx-auto">
            Conferences, side events, and convenings across all SDG goals, in one place.
          </p>

          {/* Search bar */}
          <div className="mt-8 flex items-center bg-white rounded-xl shadow-lg overflow-hidden max-w-2xl mx-auto">
            <Search className="ml-4 text-gray-400 shrink-0" size={20} />
            <input
              type="text"
              placeholder="Search events, organizations, or SDG goals…"
              className="flex-1 px-4 py-4 text-gray-800 placeholder-gray-400 text-sm focus:outline-none"
            />
            <button className="bg-[#4ea8de] hover:bg-[#3a95cc] text-white font-semibold px-6 py-4 text-sm transition-colors shrink-0">
              Search
            </button>
          </div>
        </div>
      </section>

      {/* Events section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="flex items-baseline justify-between mb-8">
          <h2 className="text-2xl font-bold text-[#0f2a4a]">Upcoming Events</h2>
          <button className="text-[#4ea8de] hover:text-[#3a95cc] text-sm font-medium transition-colors">
            View all →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {SAMPLE_EVENTS.map((event) => (
            <div
              key={event.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col gap-4 cursor-pointer group"
            >
              {/* SDG tag */}
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full w-fit ${event.sdgColor}`}>
                <Tag size={11} />
                {event.sdgTag}
              </span>

              {/* Title */}
              <h3 className="text-[#0f2a4a] font-semibold text-base leading-snug group-hover:text-[#4ea8de] transition-colors">
                {event.title}
              </h3>

              {/* Meta */}
              <div className="flex flex-col gap-2 mt-auto text-sm text-gray-500">
                <span className="flex items-center gap-2">
                  <Calendar size={14} className="shrink-0 text-gray-400" />
                  {event.date}
                </span>
                <span className="flex items-center gap-2">
                  <MapPin size={14} className="shrink-0 text-gray-400" />
                  {event.location}
                </span>
                <span className="flex items-center gap-2">
                  <Building2 size={14} className="shrink-0 text-gray-400" />
                  {event.organization}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0f2a4a] mt-8 py-8 px-4 text-center">
        <p className="text-blue-300 text-sm">
          © {new Date().getFullYear()} ForaHub. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
