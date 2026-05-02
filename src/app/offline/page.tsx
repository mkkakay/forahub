export const dynamic = "force-static";

import TryAgainButton from "./TryAgainButton";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#0f2a4a] flex flex-col items-center justify-center px-4 text-center font-sans">
      <div className="mb-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-96x96.png" alt="ForaHub" width={64} height={64} className="mx-auto rounded-xl" />
      </div>

      <h1 className="text-2xl font-bold text-white mb-2">
        Fora<span className="text-[#4ea8de]">Hub</span>
      </h1>

      <div className="w-12 h-0.5 bg-[#4ea8de]/40 my-5 mx-auto" />

      <p className="text-blue-200 text-lg font-medium mb-2">You&apos;re offline</p>
      <p className="text-blue-400 text-sm max-w-xs leading-relaxed mb-8">
        Check your connection and try again. Pages you&apos;ve visited recently may still be available.
      </p>

      <TryAgainButton />

      <p className="text-blue-500 text-xs mt-10">
        © {new Date().getFullYear()} ForaHub
      </p>
    </div>
  );
}
