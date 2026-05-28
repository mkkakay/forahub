import Navbar from "@/components/Navbar";
import SavedEventsClient from "./SavedEventsClient";
import PageHeader from "@/components/PageHeader";
import { getPageBanner } from "@/lib/pageBanners";

export default async function SavedPage() {
  const banner = await getPageBanner("saved").catch(() => null);
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navbar />

      <PageHeader
        pageKey="saved"
        title="Saved Events"
        subtitle="Your bookmarks, collections, and notes"
        banner={banner}
      />

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
