// Single source of truth for analytics tunables. If you bump any of
// these, update the privacy page copy too — the retention window in
// particular is a user-facing commitment.

/** Raw rows older than this are deleted by the daily cron prune step. */
export const ANALYTICS_RETENTION_DAYS = 425;

/** localStorage key the consent banner + context both read. Versioned so
 *  that if the legal copy or the categories of logged data ever expand
 *  we can force a re-prompt by bumping the v-suffix. Bumping this key
 *  invalidates ALL existing localStorage choices and shows the banner
 *  again — do not do casually. */
export const CONSENT_LOCAL_STORAGE_KEY = "forahub-analytics-consent-v1";

/** sessionStorage prefix for the view-action dedupe key. One entry per
 *  event-id per session. Refresh / same-tab repeat-visit = no extra row. */
export const VIEW_DEDUPE_PREFIX = "forahub-analytics-viewed-";

/** sessionStorage key for the rotating anonymous id. Tab-scoped and
 *  ephemeral — never written to localStorage or a cookie. */
export const ANON_ID_KEY = "forahub-analytics-anon-v1";
