"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

export default function PaymentSuccessPage() {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    import("canvas-confetti").then(({ default: confetti }) => {
      const end = Date.now() + 3000;
      const colors = ["#4ea8de", "#0f2a4a", "#ffffff", "#22c55e"];

      (function frame() {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors,
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors,
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      })();
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navbar />
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] px-4 py-16 text-center">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-10 max-w-md w-full">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#0f2a4a] mb-2">You are now a Pro member.</h1>
          <p className="text-gray-500 mb-8">Welcome to ForaHub Pro. Full access to the 24-month global SDG events calendar is yours.</p>
          <div className="flex flex-col gap-3">
            <Link
              href="/events"
              className="bg-[#4ea8de] hover:bg-[#3a95cc] text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Explore Events
            </Link>
            <Link
              href="/saved"
              className="border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium px-6 py-3 rounded-lg transition-colors"
            >
              Go to Saved Events
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
