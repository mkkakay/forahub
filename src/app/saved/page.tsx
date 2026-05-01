import Navbar from "@/components/Navbar";
import SavedEventsClient from "./SavedEventsClient";

export default function SavedPage() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navbar />

      {/* Dark navy header */}
      <div className="bg-[#0f2a4a] py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-2">Saved Events</h1>
          <p className="text-blue-200 text-base">Your bookmarks, collections, and notes</p>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <SavedEventsClient />
      </main>

      {/* Footer */}
      <footer className="bg-[#0f2a4a] mt-8 py-8 px-4 text-center">
        <p className="text-blue-300 text-sm">
          © {new Date().getFullYear()} ForaHub. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
