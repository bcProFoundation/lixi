import { PrismaClient } from '@bcpros/lixi-prisma';
import ReSearch from '../../src/common/redis/redis-search'
import { Redis } from 'ioredis';
import * as _ from 'lodash';
import { KeyIndexNameBuyOffer, KeyIndexNameOffer } from 'app-lixi-api/src/modules/escrow/escrow.contants';
require('dotenv').config();

const prismaClient = new PrismaClient();
const redis = new Redis({
  port: Number(process.env.REDIS_PORT) ?? 6379,
  host: process.env.REDIS_HOST
});

async function main() {
  //delete keys offer timeline in redis
  const keysOffer: string[] = await scanAndCollectKeys(redis, `lixilotus:${KeyIndexNameOffer}:*`);;
  const keysBuyOffer: string[] = await scanAndCollectKeys(redis, `lixilotus:${KeyIndexNameBuyOffer}:*`);;

  const reSearch = new ReSearch(redis);
  await reSearch.dropAll();
  Promise.all([
    redis.del(...keysOffer, ...keysBuyOffer )
  ]).then(result => {
    console.log("Finish!!")
  })
}

async function scanAndCollectKeys(redis: any, pattern: string): Promise<string[]> {
  let cursor = '0';
  const keys: string[] = [];
  do {
    const [newCursor, foundKeys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', '10000');
    if (foundKeys.length > 0) {
      keys.push(...foundKeys);
    }
    cursor = newCursor;
  } while (cursor !== '0');
  return keys;
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prismaClient.$disconnect();
  });
