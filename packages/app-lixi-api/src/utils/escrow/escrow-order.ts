import { ConfigService } from '@nestjs/config';

export function generateInlineKeyboard(url: string, miniAppEnabled: string | undefined) {
  const isMiniAppEnabled: boolean = miniAppEnabled === 'true';
  return [[isMiniAppEnabled ? { text: 'Open Mini App', web_app: { url } } : { text: 'Open Web App', url }]];
}

// Helper function with type safety
export function toHexOrNull(buffer: Buffer | null | undefined): string | null {
  return buffer ? buffer.toString('hex') : null;
}
