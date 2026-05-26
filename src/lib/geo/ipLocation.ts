// IP-based location lookup for the "Events near you" section.
// IMPORTANT: We never persist the IP address. It's used transiently for the
// current request only — the cache key is the IP, but it lives in memory and
// expires after one hour.

const CACHE_TTL_MS = 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 1500;

export interface IpLocation {
  country_code: string | null;
  country_name: string | null;
  city: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface IpapiCoResponse {
  country_code?: string;
  country_name?: string;
  city?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  error?: boolean;
}

interface IpApiComResponse {
  status?: string;
  countryCode?: string;
  country?: string;
  city?: string;
  regionName?: string;
  lat?: number;
  lon?: number;
}

const cache = new Map<string, { at: number; value: IpLocation | null }>();

function sleep(_ms: number) {
  return new Promise<void>(r => setTimeout(r, _ms));
}

async function fetchWithTimeout(url: string): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function tryIpapiCo(ip: string): Promise<IpLocation | null> {
  const res = await fetchWithTimeout(`https://ipapi.co/${encodeURIComponent(ip)}/json/`);
  if (!res || !res.ok) return null;
  const j = (await res.json().catch(() => null)) as IpapiCoResponse | null;
  if (!j || j.error) return null;
  if (!j.country_code) return null;
  return {
    country_code: j.country_code ?? null,
    country_name: j.country_name ?? null,
    city: j.city ?? null,
    region: j.region ?? null,
    latitude: typeof j.latitude === "number" ? j.latitude : null,
    longitude: typeof j.longitude === "number" ? j.longitude : null,
  };
}

async function tryIpApiCom(ip: string): Promise<IpLocation | null> {
  const res = await fetchWithTimeout(`http://ip-api.com/json/${encodeURIComponent(ip)}`);
  if (!res || !res.ok) return null;
  const j = (await res.json().catch(() => null)) as IpApiComResponse | null;
  if (!j || j.status !== "success") return null;
  return {
    country_code: j.countryCode ?? null,
    country_name: j.country ?? null,
    city: j.city ?? null,
    region: j.regionName ?? null,
    latitude: typeof j.lat === "number" ? j.lat : null,
    longitude: typeof j.lon === "number" ? j.lon : null,
  };
}

function isPrivateIp(ip: string): boolean {
  if (!ip) return true;
  if (ip === "::1" || ip === "127.0.0.1" || ip === "localhost") return true;
  if (ip.startsWith("10.") || ip.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true;
  return false;
}

export async function getLocationFromIp(ip: string | null | undefined): Promise<IpLocation | null> {
  if (!ip || isPrivateIp(ip)) return null;

  const cached = cache.get(ip);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;

  let location = await tryIpapiCo(ip);
  if (!location) {
    // brief breathing room before the fallback so we don't double-hammer on outages
    await sleep(50);
    location = await tryIpApiCom(ip);
  }

  cache.set(ip, { at: Date.now(), value: location });
  return location;
}
