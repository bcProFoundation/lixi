import { Controller, Get, HttpException, HttpStatus, Injectable, Logger, Param } from '@nestjs/common';
import * as _ from 'lodash';
import { I18n, I18nService } from 'nestjs-i18n';
import { VError } from 'verror';
import { PrismaService } from '../prisma/prisma.service';
import { PageDto } from '@bcpros/lixi-models';

@Controller('pages')
@Injectable()
export class PageController {
  private logger: Logger = new Logger(this.constructor.name);

  constructor(
    private prisma: PrismaService,
    @I18n() private i18n: I18nService
  ) {}

  @Get('address/:address')
  async getByAddress(@Param('address') address: string): Promise<PageDto> {
    try {
      const account = await this.prisma.account.findFirst({
        where: {
          address: address
        }
      });

      if (!account) {
        const couldNotFindAccount = await this.i18n.t('page.messages.couldNotFindAccount');
        throw new Error(couldNotFindAccount);
      }
      const page = await this.prisma.page.findFirst({
        where: {
          pageAccountId: account?.id
        }
      });

      if (!page) {
        const pageNotExist = await this.i18n.t('page.messages.pageNotExist');
        throw new VError(pageNotExist);
      }
      return new PageDto(page);
    } catch (err: unknown) {
      if (err instanceof VError) {
        throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
      } else {
        const unableToGetPage = await this.i18n.t('page.messages.unableToGetPage');
        const error = new VError.WError(err as Error, unableToGetPage);
        throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }
}
