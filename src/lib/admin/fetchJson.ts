/**
 * Safe parser for admin-API responses.
 *
 * Why this exists: when a request body exceeds Vercel's platform-level limit
 * (~4.5MB on Hobby), the response is plain text like "Request Entity Too Large"
 * — NOT JSON. A naive `await res.json()` then throws "Unexpected token 'R'…",
 * masking the real error. This reads the body as text first, attempts to parse,
 * and surfaces the underlying message either way.
 */
export type ParsedResponse<T = unknown> =
  | { ok: true; data: T; status: number }
  | { ok: false; error: string; status: number; rawBody?: string };

export async function parseApiResponse<T = unknown>(res: Response): Promise<ParsedResponse<T>> {
  const text = await res.text();
  const trimmed = text.trim();

  let parsed: unknown = null;
  let parseOk = false;
  if (trimmed) {
    try {
      parsed = JSON.parse(trimmed);
      parseOk = true;
    } catch {
      parseOk = false;
    }
  }

  if (res.ok) {
    if (parseOk) return { ok: true, data: parsed as T, status: res.status };
    return { ok: false, error: "Server returned 2xx with non-JSON body", status: res.status, rawBody: trimmed.slice(0, 300) };
  }

  // Non-OK: prefer the JSON error message, fall back to a snippet of the raw body.
  if (parseOk && typeof (parsed as { error?: unknown })?.error === "string") {
    return { ok: false, error: (parsed as { error: string }).error, status: res.status };
  }
  const snippet = trimmed.slice(0, 200) || `HTTP ${res.status}`;
  // Provide a friendlier hint for the common Vercel 413 case.
  const hint = res.status === 413 || /request entity too large/i.test(snippet)
    ? " (the file is larger than the platform's request-body limit — try a smaller image)"
    : "";
  return { ok: false, error: `HTTP ${res.status}: ${snippet}${hint}`, status: res.status, rawBody: snippet };
}
