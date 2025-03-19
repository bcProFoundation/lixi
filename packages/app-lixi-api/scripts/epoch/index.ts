import { PrismaClient } from '@bcpros/lixi-prisma';
import { Redis } from 'ioredis';
import * as _ from 'lodash';
import { oldEpoch, newEpoch } from '../../src/utils/constants';
require('dotenv').config();

const prismaClient = new PrismaClient();
const redis = new Redis({
  port: Number(process.env.REDIS_PORT) ?? 6379,
  host: process.env.REDIS_HOST
});

//Before run this script, need to change epoch and newEpoch variable in constants.ts (current time just mannualy change)
async function main() {
  const allKeyTimelines = await scanAndCollectKeys(redis, '*offer*');

  const diffHours = differenceInHours(oldEpoch, newEpoch);
  const halfLife = 12;
  const exponent = diffHours / halfLife;
  const divisor = Math.pow(2, -exponent);

  for (const key of allKeyTimelines) {
    //process for offer boosting (comment out when run next time)
    if (key.includes('offer:boosting')) {
        const halfLifeOffer = 168; //1 week
        const exponentOffer = diffHours / halfLifeOffer;
        const divisorOffer = Math.pow(2, -exponentOffer);
        await updateScore(key, divisorOffer);
      continue;
    }
    await updateScore(key, divisor);
    }
}

const updateScore = async (key: string, divisor: number) => {
    try {
        console.log(`Processing key: ${key}`);   

        await redis.zunionstore(key, 1, key, 'WEIGHTS', divisor); 

        console.log(`Updated scores for key: ${key}`);
    } catch {
        console.log("Error updating scores for key:", key);
    }
}

const differenceInHours = (start: string, end: string) => {
    const startDate = new Date(start).getTime();
    const endDate = new Date(end).getTime();

    // Difference in milliseconds
    const diffInMilliseconds = endDate - startDate;

    // Convert milliseconds to hours
    const diffInHours = diffInMilliseconds / (1000 * 60 * 60);

    return diffInHours;
};

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
