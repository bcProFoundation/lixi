import { PrismaClient } from '@bcpros/lixi-prisma';
import ReSearch from '../../src/common/redis/redis-search'
import { Redis } from 'ioredis';
import * as _ from 'lodash';
require('dotenv').config();

const prismaClient = new PrismaClient();
const redis = new Redis({
  port: Number(process.env.REDIS_PORT) ?? 6379,
  host: process.env.REDIS_HOST
});

async function main() {
  //delete keys timeline in redis
  let cursor = '0';
  const keysTimeline: string[] = [];
    do {
        // Use the SCAN command to find keys matching the pattern
        const [newCursor, keys] = await redis.scan(cursor, 'MATCH', "lixilotus:docOffer:*", 'COUNT', '10000');

        // If there are keys, delete them
        if (keys.length > 0) {
          keysTimeline.push(...keys)
        }

        // Update the cursor
        cursor = newCursor;
      } while (cursor !== '0');

      const reSearch = new ReSearch(redis);
      await reSearch.dropAll();
    Promise.all([
      redis.del(...keysTimeline,)
    ]).then(result => {
      console.log("Finish!!")
    })
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prismaClient.$disconnect();
  });
