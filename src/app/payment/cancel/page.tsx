import Link from "next/link";
import Navbar from "@/components/Navbar";

export default function PaymentCancelPage() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navbar />
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] px-4 py-16 text-center">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-10 max-w-md w-full">
          <div className="text-4xl mb-4">👋</div>
          <h1 className="text-2xl font-bold text-[#0f2a4a] mb-2">No worries</h1>
          <p className="text-gray-500 mb-8">You can upgrade anytime. The free tier still gives you full access to events in the next 30 days.</p>
          <div className="flex flex-col gap-3">
            <Link
              href="/pricing"
              className="bg-[#4ea8de] hover:bg-[#3a95cc] text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              View Pricing
            </Link>
            <Link
              href="/events"
              className="border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium px-6 py-3 rounded-lg transition-colors"
            >
              Browse Events
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
