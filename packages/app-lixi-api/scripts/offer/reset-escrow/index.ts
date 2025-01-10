import { PrismaClient } from '@bcpros/lixi-prisma';
import moment from 'moment';
import { Redis } from 'ioredis';
import * as _ from 'lodash';
require('dotenv').config();

const prismaClient = new PrismaClient();
const redis = new Redis({
  port: Number(process.env.REDIS_PORT) ?? 6379,
  host: process.env.REDIS_HOST
});

async function main() {
  await prismaClient.offerPaymentMethod.deleteMany({});
  await prismaClient.escrowTxId.deleteMany({});
  await prismaClient.dispute.deleteMany({});
  await prismaClient.escrowOrder.deleteMany({});

  const allOffer = await prismaClient.offer.findMany({});
  const removePosts = allOffer.map((offer) =>
    prismaClient.post.delete({
      where: {
        id: offer.postId,
      },
    })
  );

  await Promise.all(removePosts);
  
  const [keysOffer, keysOrders, keysDispute] = await Promise.all([
    scanAndCollectKeys('*offer*'),
    scanAndCollectKeys('*escrowOrders*'),
    scanAndCollectKeys('*dispute*'),
  ]);

  const allKeys = [...keysOffer, ...keysOrders, ...keysDispute];
  if (allKeys.length > 0) {
    await redis.del(...allKeys);
  }
 

  console.log("Finish!!")
}

export async function scanAndCollectKeys(pattern: string): Promise<string[]> {
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
