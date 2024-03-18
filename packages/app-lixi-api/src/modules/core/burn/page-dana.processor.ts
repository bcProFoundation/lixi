import { AccountDana, BurnCommand, BurnType, PageDana } from '@bcpros/lixi-models';
import { AccountDanaHistoryType, BurnType as BurnTypePrisma } from '@bcpros/lixi-prisma';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Redis } from 'ioredis';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { PageDanaCacheService } from '../../page/page-dana-cache.service';
import { PAGE_DANA_QUEUE } from './burn.constants';

@Injectable()
@Processor(PAGE_DANA_QUEUE)
export class PageDanaProcessor extends WorkerHost {
  private logger: Logger = new Logger(this.constructor.name);

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly prisma: PrismaService,
    private readonly pageDanaCacheService: PageDanaCacheService
  ) {
    super();
  }

  public async process(job: Job<{ command: BurnCommand; pageId: string; amount: number }, boolean, string>) {
    try {
      const { amount, command, pageId } = job.data;

      if (!pageId) throw new Error('Invalid job');

      const pageDana = await this.prisma.pageDana.findFirst({
        where: {
          pageId: pageId
        }
      });

      await this.prisma.$transaction(async prisma => {
        let receivedUpValue = pageDana?.danaReceivedUp || 0;
        let receivedDownValue = pageDana?.danaReceivedDown || 0;

        switch (command.burnType) {
          case BurnType.Up:
            receivedUpValue = receivedUpValue + amount;
            break;
          case BurnType.Down:
            receivedDownValue = receivedDownValue + amount;
            break;
        }
        const receivedScoreValue = receivedUpValue - receivedDownValue;

        let resultPageDana;
        if (!pageDana && pageId) {
          resultPageDana = await prisma.pageDana.create({
            data: {
              pageId: pageId,
              danaReceivedUp: receivedUpValue,
              danaReceivedDown: receivedDownValue,
              danaReceivedScore: receivedScoreValue,
              version: 0
            }
          });
        } else {
          resultPageDana = await prisma.pageDana.update({
            where: {
              pageId: pageDana?.pageId,
              version: pageDana?.version
            },
            data: {
              version: {
                increment: 1
              },
              danaReceivedUp: receivedUpValue,
              danaReceivedDown: receivedDownValue,
              danaReceivedScore: receivedScoreValue
            }
          });
        }

        if (resultPageDana) {
          await this.pageDanaCacheService.setPageDana(
            pageId,
            new PageDana({
              ...resultPageDana
            })
          );
        }
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
    return true;
  }
}
