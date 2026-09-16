const XEC_CHRONIK_FALLBACKS = [
  'https://xec.paybutton.io',
  'https://chronik.pay2stay.com/xec',
  'https://chronik.danaverse.org/xec',
  'https://chronik.e.cash',
  'https://chronik.lixi.app/xec'
];

/** Build deduplicated XEC Chronik URL list with optional primary from env. */
export function buildXecChronikUrls(primary?: string): string[] {
  return [...new Set([primary?.trim(), ...XEC_CHRONIK_FALLBACKS].filter((url): url is string => Boolean(url)))];
}
