import { Account, AccountDana, CreateAccountInput, ImportAccountInput, UpdateAccountInput } from '@bcpros/lixi-models';
import { ImageUploadableType } from '@bcpros/lixi-prisma';
import MinimalBCHWallet from '@bcpros/minimal-xpi-slp-wallet';
import { HttpException, HttpStatus, Inject, UseFilters, UseGuards } from '@nestjs/common';
import { Args, Mutation, Parent, Query, ResolveField, Resolver, Subscription } from '@nestjs/graphql';
import { SkipThrottle } from '@nestjs/throttler';
import { PubSub } from 'graphql-subscriptions';
import _ from 'lodash';
import { I18n, I18nContext, I18nService } from 'nestjs-i18n';
import { AccountEntity } from 'src/decorators/account.decorator';
import { PageAccountEntity } from 'src/decorators/pageAccount.decorator';
import { GqlHttpExceptionFilter } from 'src/middlewares/gql.exception.filter';
import { aesGcmDecrypt, aesGcmEncrypt, generateRandomBase58Str, hashMnemonic } from 'src/utils/encryptionMethods';
import VError from 'verror';
import { GqlJwtAuthGuard } from '../auth/guards/gql-jwtauth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { AccountCacheService } from './account-cache.service';
import AccountLoader from './account.loader';
import { WALLET_SERVICES } from '../wallet/wallet.constants';

const pubSub = new PubSub();

@SkipThrottle()
@Resolver(() => Account)
@UseFilters(GqlHttpExceptionFilter)
export class AccountResolver {
  constructor(
    private prisma: PrismaService,
    @Inject(WALLET_SERVICES) private walletServices: { [currency: string]: WalletService },
    @I18n() private i18n: I18nService,
    private readonly accountCacheService: AccountCacheService,
    private readonly accountLoader: AccountLoader
  ) {}

  @Query(() => Account)
  @UseGuards(GqlJwtAuthGuard)
  async account(@AccountEntity() myAccount: Account, @Args('id', { type: () => Number }) id: number) {
    if (!myAccount) {
      const accountNotExistMessage = await this.i18n.t('account.messages.accountNotExist');
      throw new VError(accountNotExistMessage);
    }

    if (myAccount.id !== id) {
      const noPermissionMessage = await this.i18n.t('account.messages.noPermission');
      throw new VError(noPermissionMessage);
    }

    try {
      let account = await this.accountCacheService.getById(id);

      if (!account) {
        const accountNotExistMessage = await this.i18n.t('account.messages.accountNotExist');
        throw new VError(accountNotExistMessage);
      }

      const result = _.omit(
        {
          ...account
        },
        'encryptedMnemonic',
        'encryptedSecret',
        'mnemonicHash',
        'notifications'
      );

      return result;
    } catch (err: unknown) {
      if (err instanceof VError) {
        throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
      } else {
        const unableGetAccountMessage = await this.i18n.t('account.messages.unableGetAccount');
        const error = new VError.WError(err as Error, unableGetAccountMessage);
        throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  @Query(() => Account)
  @UseGuards(GqlJwtAuthGuard)
  async getAccountByAddress(@Args('address', { type: () => String }) address: string) {
    try {
      const account = await this.accountCacheService.getByAddress(address);

      if (!account) {
        const accountNotExistMessage = await this.i18n.t('account.messages.accountNotExist');
        throw new VError(accountNotExistMessage);
      }

      const result = _.omit(
        {
          ...account
        },
        'encryptedMnemonic',
        'encryptedSecret',
        'mnemonicHash',
        'notifications'
      );

      return result;
    } catch (err: unknown) {
      if (err instanceof VError) {
        throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
      } else {
        const unableGetAccountMessage = await this.i18n.t('account.messages.unableGetAccount');
        const error = new VError.WError(err as Error, unableGetAccountMessage);
        throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  @Mutation(() => Account)
  async createAccount(@Args('data') data: CreateAccountInput) {
    if (data) {
      try {
        const walletService = this.walletServices['xpi'];
        const { address, publicKey } = await walletService.deriveAddress(data.mnemonic, 0);
        const name = address.slice(12, 17);

        const existedWallet = await this.prisma.account.findFirst({
          where: {
            address: address
          },
          orderBy: {
            updatedAt: 'desc'
          }
        });

        if (existedWallet) {
          throw new Error('account.messages.walletAlreadyExist');
        }

        // Create random account secret then encrypt it using mnemonic
        const accountSecret: string = generateRandomBase58Str(10);
        const encryptedSecret = await aesGcmEncrypt(accountSecret, data.mnemonic);

        const accountToInsert = {
          name: name,
          encryptedMnemonic: data.encryptedMnemonic,
          encryptedSecret: encryptedSecret,
          mnemonicHash: data.mnemonicHash,
          id: undefined,
          address: address,
          publicKey: publicKey,
          accountDana: {
            create: {}
          }
        };

        const createdAccount = await this.prisma.account.create({
          data: accountToInsert
        });
        await Promise.all([
          this.accountCacheService.removeByKey(createdAccount.id.toString()),
          this.accountCacheService.removeByKey(createdAccount.address)
        ]);

        const account = await this.accountCacheService.getById(createdAccount.id);

        const resultApi = _.omit(
          {
            ...data,
            ..._.omit(account, 'publicKey'),
            secret: accountSecret,
            address
          },
          ['mnemonic', 'encryptedMnemonic', 'encryptedSecret']
        );

        pubSub.publish('accountCreated', { accountCreated: resultApi });
        return resultApi;
      } catch (err) {
        if (err instanceof VError) {
          throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
        } else {
          const unableCreateAccountMessage = await this.i18n.t('account.messages.unableCreateAccount');
          const error = new VError.WError(err as Error, unableCreateAccountMessage);
          throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
        }
      }
    }
    return null as any;
  }

  @Mutation(() => Account)
  async importAccount(@Args('data') data: ImportAccountInput) {
    const { mnemonic } = data;

    try {
      const mnemonicHash = data?.mnemonicHash ?? (await hashMnemonic(mnemonic));

      const account = await this.accountCacheService.getByMnemonicHash(mnemonicHash);

      if (!account) {
        // Validate mnemonic
        const walletService = this.walletServices['xpi'];
        let isValidMnemonic = await walletService.validateMnemonic(mnemonic);
        if (!isValidMnemonic) {
          const mnemonicNotValidMessage = await this.i18n.t('account.messages.mnemonicNotValid');
          throw Error(mnemonicNotValidMessage);
        }

        // encrypt mnemonic
        const encryptedMnemonic = await aesGcmEncrypt(mnemonic, mnemonic);
        // Create random account secret then encrypt it using mnemonic
        const accountSecret: string = generateRandomBase58Str(10);
        const encryptedSecret = await aesGcmEncrypt(accountSecret, mnemonic);

        // create account in database
        const { address, publicKey } = await walletService.deriveAddress(mnemonic, 0);
        const name = address.slice(12, 17);
        const accountToInsert = {
          name: name,
          encryptedMnemonic: encryptedMnemonic,
          encryptedSecret: encryptedSecret,
          mnemonicHash: mnemonicHash,
          id: undefined,
          address: address,
          publicKey: publicKey,
          accountDana: {
            create: {}
          }
        };
        const createdAccount = await this.prisma.account.create({
          data: accountToInsert
        });

        // Invalidate the cache for the account
        await this.accountCacheService.removeByKeys([
          createdAccount.id.toString(),
          createdAccount.address,
          createdAccount.mnemonicHash
        ]);

        const newAccount = await this.accountCacheService.getById(createdAccount.id);
        const { totalBalanceInSatoshis } = await this.walletServices['xpi'].getBalances(createdAccount.address);

        const resultApi = _.omit(
          {
            ..._.omit(newAccount, 'publicKey'),
            balance: totalBalanceInSatoshis,
            secret: accountSecret
          },
          ['mnemonic', 'encryptedMnemonic']
        );

        return resultApi;
      } else {
        // Decrypt to validate the mnemonic
        const { encryptedMnemonic, encryptedSecret } = account;
        const mnemonicToValidate = await aesGcmDecrypt(encryptedMnemonic || '', mnemonic);
        if (mnemonic !== mnemonicToValidate) {
          const importAccountNotFoundMessage = await this.i18n.t('account.messages.importAccountNotFound');
          throw Error(importAccountNotFoundMessage);
        }

        const { totalBalanceInSatoshis } = await this.walletServices['xpi'].getBalances(account.address);
        const accountSecret = await aesGcmDecrypt(encryptedSecret || '', mnemonic);

        const resultApi = _.omit(
          {
            ..._.omit(account, 'publicKey'),
            name: account.name,
            address: account.address,
            balance: Number(totalBalanceInSatoshis),
            secret: accountSecret
          },
          ['mnemonic', 'encryptedMnemonic']
        );

        pubSub.publish('accountImported', { accountImported: resultApi });
        return resultApi;
      }
    } catch (err) {
      if (err instanceof VError) {
        throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
      } else {
        const importCouldNotImportAccountMessage = await this.i18n.t('account.messages.couldNotImportAccount');
        const error = new VError.WError(err as Error, importCouldNotImportAccountMessage);
        throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => Account)
  async updateAccount(@PageAccountEntity() account: Account, @Args('data') data: UpdateAccountInput) {
    if (!account) {
      const couldNotFindAccount = await this.i18n.t('page.messages.couldNotFindAccount');
      throw new VError.WError(couldNotFindAccount);
    }

    const { avatar: avatarId, cover: coverId } = data;

    /*Account Avatar*/
    if (avatarId) {
      await this.prisma.$transaction(async prisma => {
        //find account avatar image uploadable
        const result = await prisma.imageUploadable.findFirst({
          where: {
            AND: [
              {
                account: {
                  id: account.id
                }
              },
              {
                accountAvatar: {
                  id: account.id
                }
              }
            ]
          }
        });

        if (!result) {
          //if not found, create new one and connect to account and uploads
          const imageUploadable = await prisma.imageUploadable.create({
            data: {
              account: {
                connect: {
                  id: account.id
                }
              },
              uploads: {
                connect: {
                  id: avatarId
                }
              },
              accountAvatar: {
                connect: {
                  id: account.id
                }
              },
              type: ImageUploadableType.ACCOUNT_AVATAR
            }
          });

          return imageUploadable;
        } else {
          //if found, disconnect all uploads and connect new one
          await prisma.imageUploadable.update({
            where: {
              id: result.id
            },
            data: {
              uploads: {
                set: []
              }
            }
          });

          await prisma.imageUploadable.update({
            where: {
              id: result.id
            },
            data: {
              uploads: {
                connect: {
                  id: avatarId
                }
              }
            }
          });

          return result;
        }
      });
    }

    /*Account Cover*/
    if (coverId) {
      await this.prisma.$transaction(async prisma => {
        //find page avatar image uploadable
        const result = await prisma.imageUploadable.findFirst({
          where: {
            AND: [
              {
                account: {
                  id: account.id
                }
              },
              {
                accountCover: {
                  id: account.id
                }
              }
            ]
          }
        });

        if (!result) {
          //if not found, create new one and connect to account and uploads
          const imageUploadable = await prisma.imageUploadable.create({
            data: {
              account: {
                connect: {
                  id: account.id
                }
              },
              uploads: {
                connect: {
                  id: coverId
                }
              },
              accountCover: {
                connect: {
                  id: account.id
                }
              },
              type: ImageUploadableType.ACCOUNT_COVER
            }
          });

          return imageUploadable;
        } else {
          //if found, disconnect all uploads and connect new one
          await prisma.imageUploadable.update({
            where: {
              id: result.id
            },
            data: {
              uploads: {
                set: []
              }
            }
          });

          await prisma.imageUploadable.update({
            where: {
              id: result.id
            },
            data: {
              uploads: {
                connect: {
                  id: coverId
                }
              }
            }
          });

          return result;
        }
      });
    }

    const updatedAccount = await this.prisma.account.update({
      where: {
        id: _.toSafeInteger(account.id)
      },
      data: {
        ..._.omit(data, ['id', 'avatar', 'cover']),
        updatedAt: new Date()
      }
    });
    await this.accountCacheService.removeByKeys([
      updatedAccount.id.toString(),
      updatedAccount.address,
      updatedAccount.mnemonicHash,
      updatedAccount.address
    ]);

    const cachedAccount = await this.accountCacheService.getById(updatedAccount.id);

    const result = _.omit(
      {
        ...cachedAccount
      },
      'encryptedMnemonic',
      'encryptedSecret',
      'mnemonicHash',
      'notifications'
    );
    pubSub.publish('pageUpdated', { accountUpdated: result });
    return result;
  }

  @ResolveField('accountDana', () => AccountDana)
  async accountDana(@Parent() account: Account) {
    return this.accountLoader.batchAccountDanas.load(account.id);
  }

  @ResolveField('followersCount', () => Number)
  async followersCount(@Parent() account: Account) {
    return this.accountLoader.batchFollowersCount.load(account.id);
  }

  @ResolveField('followingsCount', () => Number)
  async followingsCount(@Parent() account: Account) {
    return this.accountLoader.batchFollowingsCount.load(account.id);
  }

  @ResolveField('followingPagesCount', () => Number)
  async followingPagesCount(@Parent() account: Account) {
    return this.accountLoader.batchFollowingPagesCount.load(account.id);
  }
}
