/** Default XEC Chronik endpoints (PayButton / onest-style failover list). */
export const DEFAULT_XEC_CHRONIK_URLS = [
  'https://xec.paybutton.io',
  'https://chronik.pay2stay.com/xec',
  'https://chronik.danaverse.org/xec',
  'https://chronik.e.cash',
  'https://chronik.lixi.app/xec'
];

/** Hosts that require a /xec path suffix (unlike chronik.e.cash or xec.paybutton.io). */
const HOSTS_REQUIRING_XEC_SUFFIX = /chronik\.(pay2stay|danaverse|lixi\.app)(?:\/xec\d*)?$/;

/**
 * Normalizes a single Chronik base URL for XEC.
 * Fixes legacy configs that omitted the /xec suffix on pay2stay/danaverse/lixi hosts.
 */
export function normalizeXecChronikUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;

  if (trimmed.endsWith('/xec') || trimmed.endsWith('/xec2')) {
    return trimmed;
  }

  if (HOSTS_REQUIRING_XEC_SUFFIX.test(trimmed) || trimmed === 'https://chronik.pay2stay.com') {
    return `${trimmed.replace(/\/$/, '')}/xec`;
  }

  return trimmed;
}

/**
 * Parses NEXT_PUBLIC_CHRONIK_URL (comma-separated) into validated XEC Chronik URLs.
 * Falls back to DEFAULT_XEC_CHRONIK_URLS when unset or empty.
 */
export function parseXecChronikUrls(envValue?: string): string[] {
  if (!envValue?.trim()) {
    return [...DEFAULT_XEC_CHRONIK_URLS];
  }

  const urls = envValue
    .split(',')
    .map(normalizeXecChronikUrl)
    .filter(Boolean);

  return urls.length > 0 ? urls : [...DEFAULT_XEC_CHRONIK_URLS];
}
