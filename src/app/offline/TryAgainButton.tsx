"use client";

export default function TryAgainButton() {
  return (
    <button
      onClick={() => window.location.reload()}
      className="bg-[#4ea8de] hover:bg-[#3a95cc] text-white font-semibold px-6 py-3 rounded-lg text-sm transition-colors"
    >
      Try again
    </button>
  );
}
