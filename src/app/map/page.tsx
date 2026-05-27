import Link from "next/link";
import Navbar from "@/components/Navbar";
import MapPageClient from "./MapPageClient";

export const metadata = {
  title: "Global Events Map · ForaHub",
  description: "Interactive map of upcoming in-person global development events across all 17 SDGs.",
};

export default function MapPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <header className="bg-[#0f2a4a] px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-blue-300 text-sm mb-2">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <span className="text-white">Map</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white">Global Events Map</h1>
          <p className="mt-1 text-blue-200 text-sm">
            Pan, zoom, and filter to find upcoming in-person events worldwide.
          </p>
        </div>
      </header>

      <MapPageClient />
    </div>
  );
}
