"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export default function HomeSearchBar() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  function handleSearch() {
    const q = query.trim();
    router.push(q ? `/events?q=${encodeURIComponent(q)}` : "/events");
  }

  return (
    <div className="mt-8 flex items-center bg-white rounded-xl shadow-lg overflow-hidden max-w-2xl mx-auto">
      <Search className="ml-4 text-gray-400 shrink-0" size={20} />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        placeholder="Search events, organizations, or SDG goals…"
        className="flex-1 px-4 py-4 text-gray-800 placeholder-gray-400 text-sm focus:outline-none"
      />
      <button
        onClick={handleSearch}
        className="bg-[#4ea8de] hover:bg-[#3a95cc] text-white font-semibold px-6 py-4 text-sm transition-colors shrink-0"
      >
        Search
      </button>
    </div>
  );
}
