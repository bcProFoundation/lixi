import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Inject, Injectable, Logger, OnModuleInit, forwardRef } from '@nestjs/common';
import { Redis } from 'ioredis';
import { TokenSigner, TokenVerifier, decodeToken } from 'jsontokens';
import { I18n, I18nService } from 'nestjs-i18n';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { VError } from 'verror';
// import * as wif from 'wif';
import { Account } from '@bcpros/lixi-models';
import { ModuleRef } from '@nestjs/core';
import { hashMnemonic } from '../../utils/encryptionMethods';
import { AccountCacheService } from '../account/account-cache.service';
import { WalletService } from '../wallet/wallet.service';
import { WALLET_SERVICES } from '../wallet/wallet.constants';
const wif = require('wif');

@Injectable()
export class AuthService implements OnModuleInit {
  private logger: Logger = new Logger(AuthService.name);

  // private accountCacheService!: AccountCacheService;

  constructor(
    @Inject(forwardRef(() => AccountCacheService)) private accountCacheService: AccountCacheService,
    private prisma: PrismaService,
    @InjectRedis() private readonly redis: Redis,
    @Inject(WALLET_SERVICES) private walletServices: { [currency: string]: WalletService },
    @I18n() private i18n: I18nService // private moduleRef: ModuleRef
  ) {}

  onModuleInit() {
    // this.accountCacheService = this.moduleRef.get(AccountCacheService);
  }

  /**
   * Generate the jwt token from mnemonic
   * @param mnemonic The mnemonic of the account
   * @returns The jwt token
   */
  public async login(mnemonic: string): Promise<string | never> {
    const mnemonicHash = await hashMnemonic(mnemonic);

    // Find the account
    const account = await this.prisma.account.findFirst({
      where: {
        mnemonicHash: mnemonicHash
      }
    });

    if (!account) {
      const accountNotExistMessage = await this.i18n.t('auth.messages.accountNotExist');
      throw new VError(accountNotExistMessage);
    }

    const walletService = this.walletServices['xpi'];
    const { publicKey, wifKey } = await walletService.deriveAddress(mnemonic, 0);
    if (!account.publicKey) {
      // There're  no public key, old account
      await this.prisma.account.update({
        where: {
          id: account.id
        },
        data: {
          publicKey: publicKey
        }
      });
      await this.accountCacheService.removeByKey(account.id.toString());
    }

    const dataToSign = {
      id: account.id
    };
    const wifDecoded = wif.decode(wifKey);
    const privateKey = wifDecoded.privateKey.toString('hex');

    const payload = JSON.stringify(dataToSign);
    const token = await new TokenSigner('ES256K', privateKey).signAsync(payload);
    return token;
  }

  public async verifyJwt(token: string) {
    try {
      const tokenDecoded = decodeToken(token);
      const { id } = JSON.parse(tokenDecoded.payload as string);

      // const accountCacheService = await this.moduleRef.resolve(AccountCacheService);

      // Find the account with cache
      const account = await this.accountCacheService.getById(id);

      if (!account) throw new Error('Invalid account');

      const { publicKey } = account;
      const verified = await new TokenVerifier('ES256K', publicKey || '').verifyAsync(token);

      if (verified) {
        return account;
      }
    } catch (err) {
      throw new Error('Invalid account');
    }

    throw new Error('Invalid account');
  }
}
