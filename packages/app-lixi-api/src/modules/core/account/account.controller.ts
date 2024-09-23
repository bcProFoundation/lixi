import {
  Account,
  AccountDto,
  COIN,
  CreateAccountCommand,
  DeleteAccountCommand,
  ImportAccountCommand,
  Lixi,
  NotificationDto,
  PatchAccountCommand,
  fromSmallestDenomination,
  walletPath
} from '@bcpros/lixi-models';
import { Account as AccountDb, AccountType, AddressType, Coin } from '@bcpros/lixi-prisma';
import BCHJS from '@bcpros/xpi-js';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import cashaddr from 'ecashaddrjs';
import { FastifyRequest } from 'fastify';
import _, { toSafeInteger } from 'lodash';
import { I18n, I18nContext } from 'nestjs-i18n';
import { NotificationService } from 'src/common/modules/notifications/notification.service';
import { PageAccountEntity } from 'src/decorators';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwtauth.guard';
import { WALLET_SERVICES, XPIJS } from 'src/modules/wallet/wallet.constants';
import { XecWalletService } from 'src/modules/wallet/xec-wallet.service';
import { XpiWalletService } from 'src/modules/wallet/xpi-wallet.service';
import { XrgWalletService } from 'src/modules/wallet/xrg-wallet.service ';
import { VError } from 'verror';
import { aesGcmDecrypt, aesGcmEncrypt, generateRandomBase58Str, hashMnemonic } from '../../../utils/encryptionMethods';
import { AccountCacheService } from '../../account/account-cache.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../../wallet/wallet.service';

@SkipThrottle()
@Controller('accounts')
export class AccountController {
  constructor(
    private prisma: PrismaService,
    @Inject(WALLET_SERVICES) private walletServices: { [currency: string]: WalletService },
    @Inject(XPIJS) private XPI: BCHJS,
    private readonly accountCacheService: AccountCacheService,
    private readonly notificationService: NotificationService
  ) {}

  @Get(':id')
  async getAccount(@Param('id') id: string, @I18n() i18n: I18nContext) {
    try {
      const account = await this.prisma.account.findUnique({
        where: {
          id: _.toSafeInteger(id)
        },
        include: {
          pages: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });
      if (!account) {
        const accountNotExistMessage = await i18n.t('account.messages.accountNotExist');
        throw new VError(accountNotExistMessage);
      }

      const result = {
        ...account,
        page: account.pages
      };

      return result;
    } catch (err: unknown) {
      if (err instanceof VError) {
        throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
      } else {
        const unableGetAccountMessage = await i18n.t('account.messages.unableGetAccount');
        const error = new VError.WError(err as Error, unableGetAccountMessage);
        throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  @Get('address/:id')
  async getAccountViaAddress(@Param('id') address: string, @I18n() i18n: I18nContext) {
    try {
      const account = await this.prisma.account.findFirst({
        where: {
          address: address
        },
        include: {
          pages: true,
          uploadDetail: true
        }
      });
      if (!account) {
        const accountNotExistMessage = await i18n.t('account.messages.accountNotExist');
        throw new VError(accountNotExistMessage);
      }

      const result = _.omit(account, 'encryptedMnemonic', 'encryptedSecret', 'mnemonicHash', 'notifications');

      return result;
    } catch (err: unknown) {
      if (err instanceof VError) {
        throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
      } else {
        const unableGetAccountMessage = await i18n.t('account.messages.unableGetAccount');
        const error = new VError.WError(err as Error, unableGetAccountMessage);
        throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  @Get('leaderboard')
  async getLeaderboard(@Query('limit') limit: number, @I18n() i18n: I18nContext): Promise<AccountDb[]> {
    try {
      const topAccountsDana = await this.prisma.accountDana.findMany({
        take: toSafeInteger(limit),
        orderBy: {
          danaGiven: 'desc'
        }
      });

      const accounts = await this.prisma.account.findMany({
        where: {
          id: {
            in: topAccountsDana.map(item => item.accountId)
          }
        },
        include: {
          accountDana: true,
          avatar: {
            select: {
              upload: {
                select: {
                  cfImageId: true
                }
              }
            }
          }
        },
        orderBy: {
          accountDana: {
            danaGiven: 'desc'
          }
        }
      });

      return accounts;
    } catch (err: unknown) {
      if (err instanceof VError) {
        throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
      } else {
        const getunableGetBurnListAccount = await i18n.t('account.messages.unableGetBurnListAccount');
        const error = new VError.WError(err as Error, getunableGetBurnListAccount);
        throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }
  @Post('import')
  async import(@Body() importAccountCommand: ImportAccountCommand, @I18n() i18n: I18nContext): Promise<AccountDto> {
    const { mnemonic, coin } = importAccountCommand;

    try {
      let walletService;
      let path = walletPath.XPI; //default is XPI
      switch (coin) {
        case COIN.XPI:
          walletService = this.walletServices['xpi'] as XpiWalletService;
          break;
        case COIN.XEC:
          path = walletPath.XEC;
          walletService = this.walletServices['xec'] as XecWalletService;
          break;
        case COIN.XRG:
          path = walletPath.XRG;
          walletService = this.walletServices['xrg'] as XrgWalletService;
          break;
        default:
          walletService = this.walletServices['xpi'] as XpiWalletService;
          break;
      }

      const { address, publicKey } = await walletService.deriveAddress(mnemonic, 0);
      const hash160 = this.XPI.Address.toHash160(address);
      const cashAddress = this.XPI.Address.toCashAddress(address);
      const { hash, type } = cashaddr.decode(cashAddress, false);

      const mnemonicHash = importAccountCommand?.mnemonicHash ?? (await hashMnemonic(mnemonic));
      const account = await this.prisma.account.findFirst({
        where: {
          hash160: Buffer.from(hash160, 'hex')
        },
        include: {
          walletPaths: true
        }
      });

      if (!account) {
        // Validate mnemonic
        let isValidMnemonic = await walletService.validateMnemonic(mnemonic);
        if (!isValidMnemonic) {
          const mnemonicNotValidMessage = await i18n.t('account.messages.mnemonicNotValid');
          throw Error(mnemonicNotValidMessage);
        }

        // encrypt mnemonic
        const encryptedMnemonic = await aesGcmEncrypt(mnemonic, mnemonic);
        // Create random account secret then encrypt it using mnemonic
        const accountSecret: string = generateRandomBase58Str(10);
        const encryptedSecret = await aesGcmEncrypt(accountSecret, mnemonic);

        // create account in database
        const name = address.slice(12, 17);
        const addressType = _.toUpper(type) === 'P2PKH' ? AddressType.P2PKH : AddressType.P2SH;
        let addressCoin = coin === COIN.XPI ? address : cashAddress;

        const accountToInsert = {
          name: name,
          accountType: AccountType.NORMAL,
          encryptedMnemonic: encryptedMnemonic,
          encryptedSecret: encryptedSecret,
          mnemonicHash: mnemonicHash,
          id: undefined,
          address: address,
          hash160: Buffer.from(this.XPI.Address.toHash160(address), 'hex'),
          publicKey: publicKey,
          accountDana: {
            create: {}
          },
          walletPaths: {
            create: {
              path: path,
              address: addressCoin,
              hash160: Buffer.from(hash).toString('hex'),
              type: addressType,
              network: coin ?? COIN.XPI,
              publicKey
            }
          }
        };
        const createdAccount: AccountDb = await this.prisma.account.create({
          data: accountToInsert
        });
        await this.accountCacheService.removeByKey(createdAccount.id.toString());
        const { totalBalanceInSatoshis } = await walletService.getBalances(createdAccount.address);

        const resultApi = _.omit(
          {
            ..._.omit(createdAccount, 'publicKey'),
            name: createdAccount.name,
            address: createdAccount.address,
            balance: Number(totalBalanceInSatoshis),
            secret: accountSecret,
            rootCoin: coin,
            accountType: createdAccount.accountType ?? AccountType.NORMAL
          } as AccountDto,
          ['mnemonic', 'encryptedMnemonic']
        );

        return resultApi;
      } else {
        if (account.encryptedMnemonic && account.encryptedSecret) {
          // Decrypt to validate the mnemonic
          const mnemonicToValidate = await aesGcmDecrypt(account.encryptedMnemonic, mnemonic);
          if (mnemonic !== mnemonicToValidate) {
            const importAccountNotFoundMessage = await i18n.t('account.messages.importAccountNotFound');
            throw Error(importAccountNotFoundMessage);
          }

          const { totalBalanceInSatoshis } = await walletService.getBalances(account.address);
          const accountSecret = await aesGcmDecrypt(account.encryptedSecret, mnemonic);

          //check account connect to walletPaths
          const addressType = _.toUpper(type) == 'P2PKH' ? 'P2PKH' : 'P2SH';
          if (account.walletPaths.length === 0) {
            await this.prisma.account.update({
              where: {
                id: account.id
              },
              data: {
                walletPaths: {
                  create: {
                    path: walletPath.XPI,
                    address: address,
                    hash160: Buffer.from(hash).toString('hex'),
                    type: addressType,
                    network: COIN.XPI,
                    publicKey
                  }
                }
              }
            });
          }

          const resultApi = _.omit(
            {
              ..._.omit(account, 'publicKey'),
              name: account.name,
              address: account.address,
              balance: Number(totalBalanceInSatoshis),
              secret: accountSecret,
              rootCoin: account.walletPaths[0]?.network ?? COIN.XPI,
              accountType: account.accountType ?? AccountType.NORMAL
            } as AccountDto,
            ['mnemonic', 'encryptedMnemonic']
          );

          return resultApi;
        } else {
          const resultApi = _.omit(
            {
              ...account,
              name: account.name,
              address: account.address,
              rootCoin: account.walletPaths[0]?.network ?? COIN.XPI,
              accountType: account.accountType
            } as AccountDto,
            ['mnemonic', 'encryptedMnemonic']
          );

          return resultApi;
        }
      }
    } catch (err) {
      if (err instanceof VError) {
        throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
      } else {
        const importCouldNotImportAccountMessage = await i18n.t('account.messages.couldNotImportAccount');
        const error = new VError.WError(err as Error, importCouldNotImportAccountMessage);
        throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  @Post()
  async createAccount(@Body() command: CreateAccountCommand, @I18n() i18n: I18nContext): Promise<AccountDto> {
    if (command) {
      try {
        let path = walletPath.XPI; //default is XPI
        let walletService;
        switch (command.rootCoin) {
          case COIN.XPI:
            walletService = this.walletServices['xpi'] as XpiWalletService;
            break;
          case COIN.XEC:
            path = walletPath.XEC;
            walletService = this.walletServices['xec'] as XecWalletService;
            break;
          case COIN.XRG:
            path = walletPath.XRG;
            walletService = this.walletServices['xrg'] as XrgWalletService;
            break;
          default:
            walletService = this.walletServices['xpi'] as XpiWalletService;
            break;
        }

        const { address, publicKey } = await walletService.deriveAddress(command.mnemonic, 0);
        const cashAddress = this.XPI.Address.toCashAddress(address);
        const { hash, type } = cashaddr.decode(cashAddress, false);

        const name = address.slice(12, 17);

        let encryptedSecret = undefined;
        let accountSecret = undefined;

        if (command.encryptedMnemonic) {
          // Create random account secret then encrypt it using mnemonic
          accountSecret = generateRandomBase58Str(10);
          encryptedSecret = await aesGcmEncrypt(accountSecret, command.mnemonic);
        }

        const accountToInsert = {
          name: name,
          accountType: (command.accountType as AccountType) || undefined,
          encryptedMnemonic: command.encryptedMnemonic,
          encryptedSecret: encryptedSecret,
          mnemonicHash: command.mnemonicHash,
          address: address,
          hash160: Buffer.from(this.XPI.Address.toHash160(address), 'hex'),
          publicKey: publicKey,
          telegramId: command.telegramId || undefined
        };

        const addressType = _.toUpper(type) == 'P2PKH' ? 'P2PKH' : 'P2SH';
        let addressCoin = command.rootCoin === COIN.XPI ? address : cashAddress;

        const createdAccount: AccountDb = await this.prisma.account.create({
          data: {
            ...accountToInsert,
            accountDana: {
              create: {}
            },
            walletPaths: {
              create: {
                path: path,
                address: addressCoin,
                hash160: Buffer.from(hash).toString('hex'),
                type: addressType,
                network: command.rootCoin ?? COIN.XPI,
                publicKey
              }
            }
          }
        });
        await this.accountCacheService.removeByKey(createdAccount.id.toString());

        const resultApi: AccountDto = _.omit(
          {
            ...command,
            ..._.omit(createdAccount, ['publicKey']),
            secret: accountSecret,
            address,
            accountType: command.accountType
          },
          ['mnemonic', 'encryptedMnemonic', 'encryptedSecret']
        );

        return resultApi;
      } catch (err) {
        if (err instanceof VError) {
          throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
        } else {
          const unableCreateAccountMessage = await i18n.t('account.messages.unableCreateAccount');
          const error = new VError.WError(err as Error, unableCreateAccountMessage);
          throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
        }
      }
    }
    return null as any;
  }

  @Get('telegram/:id')
  async checkAccountExistByTelegramId(@Param('id') id: string, @I18n() i18n: I18nContext) {
    try {
      const account = await this.prisma.account.findUnique({
        where: {
          telegramId: id
        }
      });
      if (!account) {
        const accountNotExistMessage = await i18n.t('account.messages.accountNotExist');
        throw new VError(accountNotExistMessage);
      }

      return true;
    } catch (err: unknown) {
      if (err instanceof VError) {
        throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
      } else {
        const unableGetAccountMessage = await i18n.t('account.messages.unableGetAccount');
        const error = new VError.WError(err as Error, unableGetAccountMessage);
        throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  @Get('telegram')
  async checkAccountPkWithTelegramId(
    @Query('telegramId') telegramId: string,
    @Query('publicKey') publicKey: string,
    @I18n() i18n: I18nContext
  ) {
    if (!telegramId || !publicKey) {
      const accountNotExistMessage = await i18n.t('account.messages.accountNotExist');
      throw new VError(accountNotExistMessage);
    }

    try {
      const account = await this.prisma.account.findFirstOrThrow({
        where: {
          AND: [
            {
              telegramId: telegramId
            },
            {
              publicKey: publicKey
            }
          ]
        }
      });
      if (!account) {
        const accountNotExistMessage = await i18n.t('account.messages.accountNotExist');
        throw new VError(accountNotExistMessage);
      }

      return true;
    } catch (err: unknown) {
      if (err instanceof VError) {
        throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
      } else {
        const unableGetAccountMessage = await i18n.t('account.messages.unableGetAccount');
        const error = new VError.WError(err as Error, unableGetAccountMessage);
        throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  @Get('telegram/unlink/:id')
  async unlinkTelegramAccount(@Param('id') id: string, @I18n() i18n: I18nContext) {
    try {
      const account = await this.prisma.account.update({
        where: {
          telegramId: id
        },
        data: {
          telegramId: null
        }
      });
      if (!account) {
        const accountNotExistMessage = await i18n.t('account.messages.accountNotExist');
        throw new VError(accountNotExistMessage);
      }

      return true;
    } catch (err: unknown) {
      if (err instanceof VError) {
        throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
      } else {
        const unableGetAccountMessage = await i18n.t('account.messages.unableGetAccount');
        const error = new VError.WError(err as Error, unableGetAccountMessage);
        throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  @Patch(':id')
  async updateAccounts(
    @Param('id') id: string,
    @Body() command: PatchAccountCommand,
    @I18n() i18n: I18nContext
  ): Promise<AccountDto> {
    if (command) {
      try {
        const account = await this.accountCacheService.getById(_.toSafeInteger(id));
        if (!account) {
          const accountDoesNotExistMessage = await i18n.t('account.messages.accountNotExist');
          throw new VError(accountDoesNotExistMessage);
        }

        // Validate the mnemonic
        const { encryptedMnemonic } = account;
        const mnemonicToValidate = await aesGcmDecrypt(encryptedMnemonic || '', command.mnemonic);
        if (command.mnemonic !== mnemonicToValidate) {
          const invalidAccountMessage = await i18n.t('account.messages.invalidAccount');
          throw new VError(invalidAccountMessage);
        }

        const updatedAccount: AccountDb = await this.prisma.account.update({
          where: {
            id: _.toSafeInteger(id)
          },
          data: {
            name: command.name,
            language: command.language,
            updatedAt: new Date(),
            secondaryLanguage: command.secondaryLanguage
          }
        });
        await this.accountCacheService.removeByKey(updatedAccount.id.toString());

        const resultApi = _.omit(
          {
            ...command,
            ..._.omit(updatedAccount, 'publicKey'),
            address: updatedAccount.address as string,
            accountType: updatedAccount.accountType
          } as AccountDto,
          ['mnemonic', 'encryptedMnemonic']
        );

        return resultApi;
      } catch (err) {
        if (err instanceof VError) {
          throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
        } else {
          const unableUpdateAccountMessage = await i18n.t('account.messages.unableUpdateAccount');
          const error = new VError.WError(err as Error, unableUpdateAccountMessage);
          throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
        }
      }
    }
    return null as any;
  }

  @Delete(':id')
  @HttpCode(204)
  async deleteAccounts(
    @Param('id') id: string,
    @Body() command: DeleteAccountCommand,
    @I18n() i18n: I18nContext
  ): Promise<AccountDto> {
    const accountId = _.toSafeInteger(id);
    try {
      const account = await this.prisma.account.findUnique({
        where: {
          id: _.toSafeInteger(id)
        },
        include: {
          lixies: true
        }
      });

      if (account && account.encryptedMnemonic) {
        // Validate the mnemonic
        const mnemonicToValidate = await aesGcmDecrypt(account.encryptedMnemonic, command.mnemonic);
        if (command.mnemonic !== mnemonicToValidate) {
          const invalidAccountMessage = await i18n.t('account.messages.invalidAccount');
          throw Error(invalidAccountMessage);
        }
      }

      let lixies = account && account.lixies ? account.lixies : [];

      if (lixies.length > 0) {
        // delete associated claims, lixies then account
        const claimDeleteCondition: Array<{ id: number }> = lixies.map(lixi => {
          return {
            id: _.toSafeInteger(lixi.id)
          };
        });
        await this.prisma.$transaction([
          this.prisma.claim.deleteMany({
            where: {
              OR: claimDeleteCondition
            }
          }),
          this.prisma.lixi.deleteMany({ where: { accountId: accountId } }),
          this.prisma.account.deleteMany({ where: { id: accountId } })
        ]);
        this.accountCacheService.removeByKey(accountId.toString());
      } else {
        this.prisma.account.deleteMany({ where: { id: accountId } });
        this.accountCacheService.removeByKey(accountId.toString());
      }

      return null as any;
    } catch (err) {
      if ((err as any).code === 'P2025') {
        // Record to delete does not exist.
        return null as any;
      }
      if (err instanceof VError) {
        throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
      } else {
        const unableDeleteAccountMessage = await i18n.t('account.messages.unableDeleteAccount');
        const error = new VError.WError(err as Error, unableDeleteAccountMessage);
        throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  @Get(':id/lixies')
  async getLixies(@Param('id') id: string, @I18n() i18n: I18nContext): Promise<any> {
    const accountId = _.toSafeInteger(id);
    try {
      let lixies = [];
      lixies = await this.prisma.lixi.findMany({
        where: {
          AND: [{ accountId: accountId }, { parentId: null }]
        }
      });

      const lixiesIds = lixies.map(item => item.id);
      const results = await Promise.all(
        lixies.map(async item => {
          const subLixies = await this.prisma.lixi.groupBy({
            _sum: {
              amount: true,
              totalClaim: true
            },
            where: {
              parentId: { in: lixiesIds }
            },
            by: ['parentId']
          });

          let subLixiBalance = 0;
          let subLixiTotalClaim = 0;
          subLixies.map(subLixi => {
            if (subLixi.parentId == item.id) {
              subLixiBalance = Number(subLixi._sum.amount);
              subLixiTotalClaim = fromSmallestDenomination(Number(subLixi._sum.totalClaim));
            }
          });

          return {
            ...item,
            totalClaim: Number(item.totalClaim),
            lixiType: Number(item.lixiType),
            maxClaim: Number(item.maxClaim),
            claimedNum: Number(item.claimedNum),
            subLixiTotalClaim: _.isNaN(subLixiTotalClaim) ? 0 : subLixiTotalClaim,
            subLixiBalance: _.isNaN(subLixiBalance) ? 0 : subLixiBalance
          } as unknown as Lixi;
        })
      );

      return results ?? [];
    } catch (err) {
      if (err instanceof VError) {
        throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
      } else {
        const unableGetLixiListMessage = await i18n.t('account.messages.unableGetLixiList');
        const error = new VError.WError(err as Error, unableGetLixiListMessage);
        throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  @Get(':id/notifications')
  @UseGuards(JwtAuthGuard)
  async getNotifications(
    @PageAccountEntity() account: Account,
    @Param('id') id: string,
    @Request() req: FastifyRequest,
    @I18n() i18n: I18nContext
  ): Promise<NotificationDto[]> {
    const accountId = _.toSafeInteger(id);

    try {
      if (!account || account?.id !== accountId) {
        const noPermissionMessage = await i18n.t('account.messages.noPermission');
        throw new VError(noPermissionMessage);
      }

      const notifications = await this.prisma.notification.findMany({
        where: {
          recipientId: accountId
        },
        include: {
          notificationType: {
            include: { notificationTypeTranslations: { select: { template: true, language: true } } }
          }
        },
        orderBy: [
          {
            createdAt: 'desc'
          }
        ],
        take: 20
      });

      return notifications.map(item => {
        return {
          ...item,
          contentNotification: this.notificationService.contentNotification(
            item.notificationType.notificationTypeTranslations,
            item.additionalData,
            account.language
          )
        } as NotificationDto;
      });
    } catch (err) {
      if (err instanceof VError) {
        throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
      } else {
        const unableGetNotification = await i18n.t('account.messages.unableGetNotification');
        const error = new VError.WError(err as Error, unableGetNotification);
        throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }
}
