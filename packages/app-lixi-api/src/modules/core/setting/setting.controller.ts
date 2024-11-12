import { CacheTTL } from '@nestjs/cache-manager';
import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Post,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import * as _ from 'lodash';
import { I18n, I18nContext } from 'nestjs-i18n';
import { PrismaService } from '../../prisma/prisma.service';
import { Setting, UpdateSettingCommand } from '@bcpros/lixi-models';
import { VError } from 'verror';

@SkipThrottle()
@Controller()
export class SettingController {
  private logger: Logger = new Logger(this.constructor.name);
  constructor(private prisma: PrismaService) {}

  @CacheTTL(600000)
  @Get('v1/settings/:accountId')
  async getSettingByAccountId(@Param('accountId') id: number, @I18n() i18n: I18nContext): Promise<any> {
    try {
      const account = await this.prisma.account.findFirst({
        where: {
          id: Number(id)
        }
      })
      if (!account) {
        const accountNotExistMessage = await i18n.t('account.messages.accountNotExist');
        throw new VError(accountNotExistMessage);
      }

      let setting = await this.prisma.setting.findFirst({
        where: {
          accountId: Number(id)
        }
      })
      
      if (!setting) {
        setting = await this.prisma.setting.create({
          data: {
            account: {
              connect: {
                id: Number(id)
              }
            }
          }
        })
      } 
      const result = setting;
      return result;
    } catch (err: unknown) {
      const unableGetEnvelope = await i18n.t('country.messages.unableGetSetting');
      throw new HttpException(unableGetEnvelope, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('v1/settings/:accountId/update')
  async import(@Body() updateSettingCommand : UpdateSettingCommand, @I18n() i18n: I18nContext): Promise<any> {
    try {
      const {accountId, lastSeedBackupTime} = updateSettingCommand;

      const account = await this.prisma.account.findFirst({
        where: {
          id: Number(accountId)
        }
      })
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
      })

      return setting;
    } catch (err) {
      this.logger.error(err);
    }
  }
}
