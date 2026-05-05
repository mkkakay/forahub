import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0f2a4a] flex flex-col items-center justify-center px-4 text-center">
      <div className="text-7xl font-extrabold text-white/20 mb-4">404</div>
      <h1 className="text-3xl font-extrabold text-white mb-3">Page Not Found</h1>
      <p className="text-blue-200 text-lg mb-8 max-w-md">
        This page doesn&apos;t exist or has been moved. Let&apos;s get you back on track.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/events" className="bg-[#4ea8de] hover:bg-[#3a95cc] text-white font-semibold px-6 py-3 rounded-xl transition-colors">
          Browse Events
        </Link>
        <Link href="/" className="border border-white/30 hover:border-white/60 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
          Go Home
        </Link>
      </div>
    </div>
  );
}
