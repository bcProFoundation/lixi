import { Body, Controller, Get, HttpException, HttpStatus, Logger, Param, Post, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import * as _ from 'lodash';
import { I18n, I18nContext } from 'nestjs-i18n';
import { PrismaService } from '../../prisma/prisma.service';
import { Account, UpdateSettingCommand } from '@bcpros/lixi-models';
import { VError } from 'verror';
import { AccountEntity } from 'src/decorators';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwtauth.guard';

@SkipThrottle()
@Controller()
export class SettingController {
  private logger: Logger = new Logger(this.constructor.name);
  constructor(private prisma: PrismaService) {}

  @Get('v1/settings/:accountId')
  @UseGuards(JwtAuthGuard)
  async getSettingsByAccountId(
    @AccountEntity() account: Account,
    @Param('accountId') id: number,
    @I18n() i18n: I18nContext
  ): Promise<any> {
    try {
      if (!account) {
        const accountNotExistMessage = await i18n.t('account.messages.accountNotExist');
        throw new VError(accountNotExistMessage);
      }

      let setting = await this.prisma.setting.findFirst({
        where: {
          accountId: Number(id)
        }
      });

      if (!setting) {
        setting = await this.prisma.setting.create({
          data: {
            account: {
              connect: {
                id: Number(id)
              }
            }
          }
        });
      }
      const result = setting;
      return result;
    } catch (err: unknown) {
      const unableGetEnvelope = await i18n.t('country.messages.unableGetSetting');
      throw new HttpException(unableGetEnvelope, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('v1/settings/:accountId/update')
  @UseGuards(JwtAuthGuard)
  async import(
    @AccountEntity() account: Account,
    @Body() updateSettingCommand: UpdateSettingCommand,
    @I18n() i18n: I18nContext
  ): Promise<any> {
    try {
      const { accountId, lastSeedBackupTime } = updateSettingCommand;

      if (!account) {
        const accountNotExistMessage = await i18n.t('account.messages.accountNotExist');
        throw new VError(accountNotExistMessage);
      }

      const setting = await this.prisma.setting.update({
        where: {
          accountId: Number(accountId)
        },
        data: {
          lastSeedBackupTime: lastSeedBackupTime
        }
      });

      return setting;
    } catch (err) {
      this.logger.error(err);
    }
  }
}
