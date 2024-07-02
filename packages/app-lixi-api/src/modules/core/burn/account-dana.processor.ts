import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Redis } from 'ioredis';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { ACCOUNT_DANA_QUEUE } from './burn.constants';
import { AccountDanaHistoryType, BurnType as BurnTypePrisma } from '@bcpros/lixi-prisma';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { AccountDana, BurnCommand, BurnType } from '@bcpros/lixi-models';
import { AccountDanaCacheService } from '../../account/account-dana-cache.service';

@Injectable()
@Processor(ACCOUNT_DANA_QUEUE, { concurrency: 1 })
export class AccountDanaProcessor extends WorkerHost {
  private logger: Logger = new Logger(this.constructor.name);

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly prisma: PrismaService,
    private readonly accountDanaCacheService: AccountDanaCacheService
  ) {
    super();
  }

  public async process(
    job: Job<
      { command: BurnCommand; txid: string; amount: number; givenDanaAddress: string; receivedDanaAddress: string },
      boolean,
      string
    >
  ) {
    try {
      const { amount, command, givenDanaAddress, receivedDanaAddress, txid } = job.data;

      //Check if self burn
      if (givenDanaAddress === receivedDanaAddress) {
        const accountDanaDb = await this.prisma.accountDana.findFirst({
          where: {
            account: {
              address: givenDanaAddress
            }
          }
        });

        await this.prisma.$transaction(async prisma => {
          let givenUpValue = 0.0;
          let givenDownValue = 0.0;

          switch (command.burnType) {
            case BurnType.Up:
              givenUpValue = amount;
              break;
            case BurnType.Down:
              givenDownValue = amount;
              break;
          }

          const danaGiven = accountDanaDb?.danaGiven! + amount;

          const updatedAccountDana = await prisma.accountDana.update({
            where: {
              id: accountDanaDb?.id,
              version: accountDanaDb?.version
            },
            data: {
              danaGiven: danaGiven,
              version: {
                increment: 1
              }
            }
          });

          if (!updatedAccountDana) throw new Error('Unable to update account dana');

          const accountDana = new AccountDana({
            ...updatedAccountDana
          });
          await this.accountDanaCacheService.setAccountDana(accountDana.accountId, accountDana);
          await prisma.accountDanaHistory.create({
            data: {
              txid: txid,
              burnType: command.burnType ? BurnTypePrisma.UPVOTE : BurnTypePrisma.DOWNVOTE,
              accountDana: {
                connect: {
                  id: updatedAccountDana?.id
                }
              },
              burnForId: command.burnForId,
              burnForType: command.burnForType,
              type: AccountDanaHistoryType.GIVEN,
              givenUpValue: givenUpValue,
              givenDownValue: givenDownValue
            }
          });
        });
      } else {
        const givenAccountDana = await this.prisma.accountDana.findFirst({
          where: {
            account: {
              address: givenDanaAddress
            }
          }
        });

        await this.prisma.$transaction(async prisma => {
          let givenUpValue = 0.0;
          let givenDownValue = 0.0;
          let receivedUpValue = 0.0;
          let receivedDownValue = 0.0;

          switch (command.burnType) {
            case BurnType.Up:
              givenUpValue = amount;
              receivedUpValue = amount;
              break;
            case BurnType.Down:
              givenDownValue = amount;
              receivedDownValue = amount;
              break;
          }

          const danaGiven = givenAccountDana?.danaGiven! + amount;

          const updatedGivenAccountDana = await prisma.accountDana.update({
            where: {
              id: givenAccountDana?.id,
              version: givenAccountDana?.version
            },
            data: {
              danaGiven: danaGiven,
              version: {
                increment: 1
              }
            }
          });

          if (givenAccountDana && !updatedGivenAccountDana) throw new Error('Unable to update account dana');

          await prisma.accountDanaHistory.create({
            data: {
              txid: txid,
              burnType: command.burnType ? BurnTypePrisma.UPVOTE : BurnTypePrisma.DOWNVOTE,
              accountDana: {
                connect: {
                  id: updatedGivenAccountDana?.id
                }
              },
              burnForId: command.burnForId,
              burnForType: command.burnForType,
              type: AccountDanaHistoryType.GIVEN,
              givenUpValue: givenUpValue,
              givenDownValue: givenDownValue
            }
          });

          const givenAccDana = new AccountDana({
            ...updatedGivenAccountDana
          });

          if (receivedDanaAddress !== null) {
            //update received account
            const receivedAccountDana = await this.prisma.accountDana.findFirst({
              where: {
                account: {
                  address: receivedDanaAddress
                }
              }
            });

            const danaReceived =
              command.burnType === BurnType.Up
                ? receivedAccountDana?.danaReceived! + amount
                : receivedAccountDana?.danaReceived! - amount;

            const updatedRecivedAccountDana = await prisma.accountDana.update({
              where: {
                id: receivedAccountDana?.id,
                version: receivedAccountDana?.version
              },
              data: {
                danaReceived: danaReceived,
                version: {
                  increment: 1
                }
              }
            });

            if (receivedAccountDana && !updatedRecivedAccountDana) throw new Error('Unable to update account dana');

            await prisma.accountDanaHistory.create({
              data: {
                txid: txid,
                burnType: command.burnType ? BurnTypePrisma.UPVOTE : BurnTypePrisma.DOWNVOTE,
                accountDana: {
                  connect: {
                    id: updatedRecivedAccountDana?.id
                  }
                },
                burnForId: command.burnForId,
                burnForType: command.burnForType,
                type: AccountDanaHistoryType.RECEIVED,
                receivedUpValue: receivedUpValue,
                receivedDownValue: receivedDownValue
              }
            });

            const receivedAccDana = new AccountDana({
              ...updatedRecivedAccountDana
            });
            await Promise.all([
              this.accountDanaCacheService.setAccountDana(givenAccDana.accountId, givenAccDana),
              this.accountDanaCacheService.setAccountDana(receivedAccDana.accountId, receivedAccDana)
            ]);
          } else {
            //don't have received account
            await this.accountDanaCacheService.setAccountDana(givenAccDana.accountId, givenAccDana);
          }
        });
      }
    } catch (error) {
      this.logger.error(error);
      return false;
    }
    return true;
  }
}
