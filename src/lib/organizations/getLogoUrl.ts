import { adminSupabase } from "@/lib/supabase/admin";
import { inferDomainFromOrg } from "./inferDomain";
import { fetchFromBrandfetch } from "./fetchFromBrandfetch";

// Don't re-attempt a previously failed lookup more often than this.
const RETRY_COOLDOWN_MS = 24 * 60 * 60 * 1000;

type LogoRow = {
  organization_name: string;
  domain: string | null;
  logo_url: string | null;
  status: string;
  last_attempted_at: string | null;
};

async function readCache(orgName: string): Promise<LogoRow | null> {
  const { data } = await adminSupabase
    .from("organization_logos")
    .select("organization_name, domain, logo_url, status, last_attempted_at")
    .eq("organization_name", orgName)
    .maybeSingle();
  return (data as LogoRow | null) ?? null;
}

/**
 * Fetch a logo from Brandfetch and persist the result. Used by both the
 * fire-and-forget path in getLogoUrl() and the explicit API/seed-script paths.
 */
export async function fetchAndCacheLogo(orgName: string): Promise<{
  logoUrl: string | null;
  status: "success" | "not_found" | "error";
  message?: string;
}> {
  const domain = inferDomainFromOrg(orgName);
  if (!domain) {
    await adminSupabase
      .from("organization_logos")
      .upsert(
        {
          organization_name: orgName,
          domain: null,
          logo_url: null,
          status: "not_found",
          last_attempted_at: new Date().toISOString(),
        },
        { onConflict: "organization_name" }
      );
    return { logoUrl: null, status: "not_found", message: "Could not infer a domain" };
  }

  const result = await fetchFromBrandfetch(domain);
  const now = new Date().toISOString();

  if (result.status === "success") {
    await adminSupabase
      .from("organization_logos")
      .upsert(
        {
          organization_name: orgName,
          domain,
          logo_url: result.logoUrl,
          status: "success",
          fetched_at: now,
          last_attempted_at: now,
        },
        { onConflict: "organization_name" }
      );
    return { logoUrl: result.logoUrl, status: "success" };
  }

  if (result.status === "not_found") {
    await adminSupabase
      .from("organization_logos")
      .upsert(
        {
          organization_name: orgName,
          domain,
          logo_url: null,
          status: "not_found",
          last_attempted_at: now,
        },
        { onConflict: "organization_name" }
      );
    return { logoUrl: null, status: "not_found" };
  }

  // error
  await adminSupabase
    .from("organization_logos")
    .upsert(
      {
        organization_name: orgName,
        domain,
        logo_url: null,
        status: "error",
        last_attempted_at: now,
      },
      { onConflict: "organization_name" }
    );
  return { logoUrl: null, status: "error", message: result.message };
}

/**
 * Returns the cached logo URL for an org, or null if uncached / not found.
 * When uncached and not recently attempted, fires a background fetch (fire-and-forget)
 * so the next page render has it.
 */
export async function getLogoUrl(orgName: string): Promise<string | null> {
  if (!orgName || !orgName.trim()) return null;

  const cached = await readCache(orgName).catch(() => null);
  if (cached?.status === "success" && cached.logo_url) return cached.logo_url;

  const recentlyAttempted =
    cached?.last_attempted_at &&
    Date.now() - new Date(cached.last_attempted_at).getTime() < RETRY_COOLDOWN_MS;

  if (!recentlyAttempted) {
    // Fire-and-forget; swallow errors so they don't crash the surrounding handler.
    void fetchAndCacheLogo(orgName).catch(() => {});
  }

  return null;
}

/**
 * Look up logos for many organizations at once. Reads the cache in one query
 * and triggers background fetches for any misses. Returns a map of
 * orgName -> logoUrl (only successful hits are included).
 */
export async function batchGetLogos(orgNames: string[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(orgNames.filter(n => typeof n === "string" && n.trim().length > 0)));
  if (unique.length === 0) return {};

  const { data } = await adminSupabase
    .from("organization_logos")
    .select("organization_name, logo_url, status, last_attempted_at")
    .in("organization_name", unique);

  const rows = (data as Pick<LogoRow, "organization_name" | "logo_url" | "status" | "last_attempted_at">[] | null) ?? [];
  const byName = new Map(rows.map(r => [r.organization_name, r]));

  const out: Record<string, string> = {};
  for (const name of unique) {
    const row = byName.get(name);
    if (row?.status === "success" && row.logo_url) {
      out[name] = row.logo_url;
      continue;
    }
    const recentlyAttempted =
      row?.last_attempted_at &&
      Date.now() - new Date(row.last_attempted_at).getTime() < RETRY_COOLDOWN_MS;
    if (!recentlyAttempted) {
      void fetchAndCacheLogo(name).catch(() => {});
    }
  }

  return out;
}
