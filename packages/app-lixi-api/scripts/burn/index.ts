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
  //delete burn < 07-08-2024 (the date we reset dana)
  const cutoffDate = new Date('2024-08-07');
  await prismaClient.burn.deleteMany({
    where: {
      createdAt: {
        lt: cutoffDate
      }
    }
  })
  //delete cache burn
  let cursor = '0';
  const keysBurn: string[] = [];
  do {
      // Use the SCAN command to find keys matching the pattern
      const [newCursor, keys] = await redis.scan(cursor, 'MATCH', "*burn*", 'COUNT', '10000');

      // If there are keys, delete them
      if (keys.length > 0) {
        keysBurn.push(...keys)
      }

      // Update the cursor
      cursor = newCursor;
  } while (cursor !== '0');

    //delete cache viewscore
    let cursorDanaView = '0';
    const keysDanaView: string[] = [];
    do {
        // Use the SCAN command to find keys matching the pattern
        const [newCursor, keys] = await redis.scan(cursorDanaView, 'MATCH', "*danaview*", 'COUNT', '10000');

        // If there are keys, delete them
        if (keys.length > 0) {
          keysDanaView.push(...keys)
        }

        // Update the cursor
        cursorDanaView = newCursor;
      } while (cursorDanaView !== '0');

    //delete cache viewScore page-account-token
    let cursorDanaViewLoader = '0';
    const keysDanaViewLoader: string[] = [];
    do {
        // Use the SCAN command to find keys matching the pattern
        const [newCursor, keys] = await redis.scan(cursorDanaViewLoader, 'MATCH', "*DanaViewScoreLoader*", 'COUNT', '10000');

        // If there are keys, delete them
        if (keys.length > 0) {
          keysDanaViewLoader.push(...keys)
        }

        // Update the cursor
        cursorDanaViewLoader = newCursor;
      } while (cursorDanaViewLoader !== '0');

    //delete
    await redis.del(...keysBurn, ...keysDanaView, ...keysDanaViewLoader);
 
  console.log("finish!")
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prismaClient.$disconnect();
  });
