import { PrismaClient } from '@bcpros/lixi-prisma';
import { Redis } from 'ioredis';
import * as _ from 'lodash';
require('dotenv').config();

const prismaClient = new PrismaClient();
const redis = new Redis({
  port: Number(process.env.REDIS_PORT) ?? 6379,
  host: process.env.REDIS_HOST
});

async function main() {
  const keyMyOfferAtive = await scanAndCollectKeys(redis, '*ACTIVE*');
  const keyMyOfferArchive = await scanAndCollectKeys(redis, '*ARCHIVE*');

  await redis.del([...keyMyOfferAtive, ...keyMyOfferArchive]);

  console.log('Finish!!');
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
