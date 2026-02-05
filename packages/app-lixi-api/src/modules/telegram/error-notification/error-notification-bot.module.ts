import { DynamicModule, Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { ConfigService } from '@nestjs/config';

/**
 * ErrorNotificationBotModule - Uses the shared local-ecash bot for error notifications.
 * The error notification bot is now deprecated and shares the same bot instance
 * as the main local-ecash bot (TELEGRAM_LOCAL_ECASH_BOT_TOKEN).
 */
@Module({})
export class ErrorNotificationBotModule {
  public static forRootAsync(): DynamicModule {
    const imports = [];

    // Use the shared local-ecash bot token for error notifications
    // The dedicated error notification bot is deprecated
    process.env.TELEGRAM_ERROR_NOTIFICATION_BOT_TOKEN &&
      imports.push(
        TelegrafModule.forRootAsync({
          inject: [ConfigService],
          botName: process.env.TELEGRAM_LOCAL_ECASH_BOT_NAME,
          useFactory: async (configService: ConfigService) => {
            return {
              token: configService.get<string>('TELEGRAM_ERROR_NOTIFICATION_BOT_TOKEN')!,
              include: [],
              botName: process.env.TELEGRAM_LOCAL_ECASH_BOT_NAME
            };
          }
        })
      );

    return {
      module: ErrorNotificationBotModule,
      imports: imports,
      providers: [],
      exports: []
    } as DynamicModule;
  }
}
