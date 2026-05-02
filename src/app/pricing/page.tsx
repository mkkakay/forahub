import Navbar from "@/components/Navbar";
import PricingClient from "./PricingClient";
import { supabase } from "@/lib/supabase/client";

export const revalidate = 60;

async function getFoundingCount(): Promise<number> {
  const { data, error } = await supabase.rpc("get_founding_member_count");
  if (error) return 0;
  return data ?? 0;
}

export default async function PricingPage() {
  const foundingCount = await getFoundingCount();

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navbar />
      <PricingClient foundingCount={foundingCount} />
      <footer className="bg-[#0f2a4a] py-8 px-4 text-center">
        <p className="text-blue-300 text-sm">
          © {new Date().getFullYear()} ForaHub. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
