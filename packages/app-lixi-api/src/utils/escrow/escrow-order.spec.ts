import { MISSING_TELEGRAM_USERNAME_LABEL, escapeTelegramMarkdown, missingTelegramChatMessage } from './escrow-order';

describe('escapeTelegramMarkdown', () => {
  it('uses a label when the username is missing', () => {
    expect(escapeTelegramMarkdown(null)).toBe(MISSING_TELEGRAM_USERNAME_LABEL);
    expect(escapeTelegramMarkdown(undefined)).toBe(MISSING_TELEGRAM_USERNAME_LABEL);
    expect(escapeTelegramMarkdown('   ')).toBe(MISSING_TELEGRAM_USERNAME_LABEL);
  });

  it('escapes Telegram Markdown characters', () => {
    expect(escapeTelegramMarkdown('@user_name')).toBe('@user\\_name');
    expect(escapeTelegramMarkdown('a.b-c')).toBe('a\\.b\\-c');
  });

  it('leaves a plain username unchanged', () => {
    expect(escapeTelegramMarkdown('@localecash')).toBe('@localecash');
  });
});

describe('missingTelegramChatMessage', () => {
  it('names the party that cannot be reached', () => {
    expect(missingTelegramChatMessage('buyer')).toContain('The buyer');
    expect(missingTelegramChatMessage('seller')).toContain('The seller');
    expect(missingTelegramChatMessage('person')).toContain('This person');
  });
});
