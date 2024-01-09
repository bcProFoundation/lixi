import { Account, POST_FLAG, Repost, UploadDetail } from '@bcpros/lixi-models';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Inject, Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { Redis } from 'ioredis';
import _ from 'lodash';
import { AccountCacheService } from '../account/account-cache.service';
import { PrismaService } from '../prisma/prisma.service';
import { PageCacheService } from './page-cache.service';
import { RedisDataLoader } from '../../common/redis/redis-dataloader';
import BCHJS from '@bcpros/xpi-js';
import { XPIJS } from '../wallet/wallet.constants';
import { template } from 'src/utils/stringTemplate';

@Injectable({ scope: Scope.REQUEST })
export default class PostLoader {
  //post-bitmap
  static bitMapPostKey = 'bitmap:post:{{postId}}';

  constructor(
    private readonly prisma: PrismaService,
    @InjectRedis() private readonly redis: Redis,
    private readonly pageCacheService: PageCacheService,
    private readonly accountCacheService: AccountCacheService,
    @Inject(XPIJS) private XPI: BCHJS
  ) {}

  public async getPostsUploadsByBatch(postIds: readonly string[]): Promise<(UploadDetail | any)[]> {
    const ids = postIds as unknown as string[];
    const uploadsDb = await this.prisma.uploadDetail.findMany({
      where: {
        postId: { in: ids }
      },
      include: {
        upload: {
          select: {
            id: true,
            sha: true,
            bucket: true,
            width: true,
            height: true,
            cfImageId: true,
            cfImageFilename: true,
            originalFilename: true,
            extension: true,
            type: true,
            thumbnailHeight: true,
            thumbnailWidth: true
          }
        }
      }
    });
    const uploads = uploadsDb.map(item => {
      const upload: UploadDetail = {
        id: item.id,
        postId: item.postId,
        upload: {
          ...item.upload,
          sha: item.upload.sha || ''
        }
      };
      return upload;
    });

    return postIds.map(postId => {
      return uploads.filter(item => item.postId == postId) || null;
    });
  }

  public readonly batchUploads = new DataLoader<string, UploadDetail[]>(async (postIds: readonly string[]) => {
    return await this.getPostsUploadsByBatch(postIds);
  });

  public readonly batchPages = new DataLoader(async (ids: readonly string[]) => {
    const pageIds = ids as unknown as string[];
    const pages = await this.pageCacheService.getByIds(pageIds);
    const pagesMap = new Map(_.compact(pages).map(page => [page.id, page]));
    const data = ids.map((id, index) => {
      return pagesMap.get(id) ?? null;
    });
    return Promise.resolve(data);
  });

  public readonly batchAccounts = new DataLoader(async (accountIds: readonly number[]) => {
    const ids = (accountIds as unknown as number[]) ?? [];
    const accounts = await this.accountCacheService.getByIds(ids);
    const data = accountIds.map((accountId, index) => {
      return accounts[index] ?? new Account({ id: accountId });
    });
    return Promise.resolve(data);
  });

  public readonly batchAccountsByAddressHash160 = new DataLoader(async (addresses: readonly string[]) => {
    const listAddressHash160 = (addresses as unknown as string[]) ?? [];
    const listAddress = listAddressHash160.map(item => this._convertBurnedByToAddress(item));
    const accounts = await this.accountCacheService.getByAddresses(listAddress);
    const data = listAddress.map((address, index) => {
      return accounts[index] ?? new Account({ address: address });
    });
    return Promise.resolve(data);
  });

  public readonly batchReposts = new RedisDataLoader(
    this.redis,
    'dataloader:PostLoader:batchReposts',
    new DataLoader(
      async (postIds: readonly string[]) => {
        const ids = (postIds as unknown as string[]) ?? [];

        const repostsDb = await this.prisma.repost.findMany({
          where: {
            postId: {
              in: ids
            }
          },
          include: {
            account: true
          }
        });
        const reposts = repostsDb.map(item => {
          return new Repost({
            ...item
          });
        });
        return postIds.map(postId => {
          return reposts.filter(item => item.postId == postId) || null;
        });
      },
      {
        cache: false
      }
    ),
    {
      expire: 600,
      buffer: false
    }
  );

  public readonly batchRepostCount = new RedisDataLoader(
    this.redis,
    'dataloader:PostLoader:batchRepostCount',
    new DataLoader(
      async (postIds: readonly string[]) => {
        const ids = (postIds as unknown as string[]) ?? [];
        const repostCount = await this.prisma.repost.groupBy({
          by: ['postId'],
          _count: {
            _all: true
          },
          where: {
            postId: {
              in: ids
            }
          }
        });
        const repostCountMap = new Map(
          repostCount.map(value => {
            return [value.postId, value._count._all];
          })
        );
        return postIds.map(postId => {
          return repostCountMap.get(postId) ?? 0;
        });
      },
      {
        cache: false
      }
    ),
    {
      expire: 600,
      buffer: false,
      serialize: value => {
        return value.toString();
      },
      deserialize: value => {
        return _.toSafeInteger(value);
      }
    }
  );

  public readonly batchPostHasBurnedByOthers = new DataLoader(async (postIds: readonly string[]) => {
    const pipeline = this.redis.pipeline();

    postIds.map(id => {
      pipeline.getbit(template(`${PostLoader.bitMapPostKey}`, { postId: id }), POST_FLAG.BURNED_BY_OTHERS);
    });

    //exec pipeline
    const result = await pipeline.exec();

    return result == null
      ? postIds.map(item => false)
      : result.map(item => {
          if (item[0] != null) return false;
          return !!item[1];
        });
  });

  _convertBurnedByToAddress = (burnedBy: string): string => {
    const legacyAddress = this.XPI.Address.hash160ToLegacy(burnedBy);

    const publicAddress = this.XPI.Address.toXAddress(legacyAddress);

    return publicAddress;
  };
}
