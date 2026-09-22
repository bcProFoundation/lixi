/** Telegram legacy Markdown characters that must be escaped in usernames. */
const TELEGRAM_MARKDOWN_SPECIAL = /([|{}\[\]*_~#+>!=\-.])/g;

export const MISSING_TELEGRAM_USERNAME_LABEL = 'no Telegram username';

/**
 * Escape a Telegram username for legacy Markdown.
 * A missing username must not throw: some accounts never linked Telegram.
 */
export function escapeTelegramMarkdown(username: string | null | undefined): string {
  const value = username?.trim();
  if (!value) return MISSING_TELEGRAM_USERNAME_LABEL;
  return value.replace(TELEGRAM_MARKDOWN_SPECIAL, '\\$1');
}

export function missingTelegramChatMessage(role: 'buyer' | 'seller' | 'person'): string {
  const who = role === 'person' ? 'This person' : `The ${role}`;
  return `${who} has no Telegram account linked, so a chat request cannot be delivered.`;
}

export function generateInlineKeyboard(url: string, miniAppEnabled: string | undefined) {
  const isMiniAppEnabled: boolean = miniAppEnabled === 'true';
  return [[isMiniAppEnabled ? { text: 'Open Mini App', web_app: { url } } : { text: 'Open Web App', url }]];
}

// Helper function with type safety
export function toHexOrNull(buffer: Buffer | null | undefined): string | null {
  return buffer ? buffer.toString('hex') : null;
}
