import Navbar from "@/components/Navbar";
import MapPageClient from "./MapPageClient";
import PageHeader from "@/components/PageHeader";
import { getPageBanner } from "@/lib/pageBanners";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Global Events Map · ForaHub",
  description: "Interactive map of upcoming in-person global development events across all 17 SDGs.",
};

export default async function MapPage() {
  const banner = await getPageBanner("map").catch(() => null);
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Navbar />
      <PageHeader
        pageKey="map"
        title="Global Events Map"
        subtitle="Pan, zoom, and filter to find upcoming in-person events worldwide."
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Map" }]}
        variant="slim"
        banner={banner}
      />
      <main id="main-content">
        <MapPageClient />
      </main>
    </div>
  );
}
