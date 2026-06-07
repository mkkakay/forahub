import { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { getPageBanner } from "@/lib/pageBanners";

export const metadata: Metadata = {
  title: "Data Sources",
  description: "How ForaHub collects and sources event data.",
};

export default async function DataSourcesPage() {
  const banner = await getPageBanner("data-sources").catch(() => null);
  const categories = [
    { name: "UN Agencies & Bodies", examples: "WHO, UNICEF, UNDP, UNEP, UNESCO, FAO, WFP, ILO, UNHCR" },
    { name: "International Financial Institutions", examples: "World Bank, IMF, African Development Bank, Asian Development Bank, IADB" },
    { name: "Global Health Organizations", examples: "Gavi, Global Fund, CEPI, PATH, MSF, Partners in Health" },
    { name: "Climate & Environment", examples: "UNFCCC, IPCC, Climate Investment Funds, Green Climate Fund" },
    { name: "Academic & Research Institutions", examples: "London School of Hygiene, Johns Hopkins, Harvard T.H. Chan, Oxford" },
    { name: "NGO Networks", examples: "CIVICUS, InterAction, Bond, CONCORD, Devex partner organizations" },
    { name: "Government Ministries", examples: "Health ministries, finance ministries, foreign affairs offices" },
    { name: "Regional Bodies", examples: "African Union, ASEAN, ECOWAS, SAARC, Commonwealth Secretariat" },
    { name: "Conference Aggregators", examples: "AllConferences, Eventbrite (development category), UN Calendar" },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <PageHeader
        pageKey="data-sources"
        title="Data Sources"
        subtitle="How we collect and attribute event data"
        banner={banner}
      />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <section>
          <h2 className="text-xl font-bold text-[#0f2a4a] dark:text-white mb-3">Our Approach</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            ForaHub aggregates publicly available event information from organizational websites, official event calendars, press releases, and RSS feeds. All event data sourced from third parties remains the intellectual property of the respective organizations.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#0f2a4a] dark:text-white mb-4">Source Categories</h2>
          <div className="space-y-3">
            {categories.map(({ name, examples }) => (
              <div key={name} className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-xl p-4">
                <h3 className="font-semibold text-sm text-[#0f2a4a] dark:text-white">{name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{examples}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-5">
          <h2 className="text-lg font-bold text-amber-800 dark:text-amber-200 mb-2">Event Update or Removal Requests</h2>
          <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
            If you are an organization and need to update, correct, or remove an event listing, please contact us. We aim to process all requests within 24 hours.
          </p>
          <Link href="/contact" className="inline-flex items-center gap-2 bg-amber-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors">
            Request Update or Removal
          </Link>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#0f2a4a] dark:text-white mb-3">Data Quality</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            All events are reviewed for quality and accuracy. We use AI-assisted classification to tag events with relevant SDG goals, regions, and formats. Human review is applied to featured and promoted listings. Despite our best efforts, event details can change — always verify with the organizing institution before registering.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#0f2a4a] dark:text-white mb-3">Open Data Partners</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Our organization directory blends our own curation with open public-domain datasets. We credit each source per its license terms. If you spot a missed attribution, write to{" "}
            <a href="mailto:hello@forahub.org" className="text-[#4ea8de] hover:underline">hello@forahub.org</a>.
          </p>
          <div className="space-y-3">
            <div className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-xl p-4">
              <h3 className="font-semibold text-sm text-[#0f2a4a] dark:text-white">
                Research Organization Registry (ROR)
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                CC0 1.0 Public Domain Dedication ·{" "}
                <a href="https://ror.org/" target="_blank" rel="noopener noreferrer" className="text-[#4ea8de] hover:underline">ror.org</a>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
                Open registry of research organizations — universities, institutes, hospitals, government labs, funders — maintained by Crossref, DataCite, and a community of contributors. ForaHub imports ROR records (names, aliases, types, country, official website, Wikidata / GRID / ISNI / FundRef cross-references) to seed the global organization directory.
              </p>
            </div>
            <div className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-xl p-4">
              <h3 className="font-semibold text-sm text-[#0f2a4a] dark:text-white">
                International Aid Transparency Initiative (IATI)
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Public domain — IATI Standard data ·{" "}
                <a href="https://iatistandard.org/" target="_blank" rel="noopener noreferrer" className="text-[#4ea8de] hover:underline">iatistandard.org</a>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
                The international standard for publishing aid, development, and humanitarian resource flows. We pull the canonical list of bilateral donors, multilateral agencies, INGOs, and foundations registered with IATI via the IATI Datastore, including names, organisation identifiers, types, and official websites.
              </p>
            </div>
            <div className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-xl p-4">
              <h3 className="font-semibold text-sm text-[#0f2a4a] dark:text-white">
                OpenStreetMap, OpenMapTiles, Stadia Maps, CARTO
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                ODbL / provider terms ·{" "}
                <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="text-[#4ea8de] hover:underline">OSM</a>{" "}·{" "}
                <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer" className="text-[#4ea8de] hover:underline">CARTO</a>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
                Base map tiles and geocoding for the events map. Stadia Maps is our primary tile provider (Outdoors / Alidade Smooth Dark), with CARTO as a safety fallback. Reverse and forward geocoding via Nominatim and LocationIQ.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
