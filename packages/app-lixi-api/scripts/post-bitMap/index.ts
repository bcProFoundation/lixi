import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import * as _ from 'lodash';
require('dotenv').config();

const prismaClient = new PrismaClient();
const redis = new Redis({
  port: Number(process.env.REDIS_PORT) ?? 6379,
  host: process.env.REDIS_HOST
});

async function main() {
  const pipeline = redis.pipeline();
  const allPost = await prismaClient.post.findMany({
    select: {
      id: true,
      account: { select: { hash160: true } }
    }
  });

  const groupBurnOfPost = await prismaClient.burn.groupBy({
    by: ['burnForId', 'burnedBy']
  });

  const groupPost = _.groupBy(groupBurnOfPost, item => item.burnForId);

  for (const post of allPost) {
    if (groupPost[post.id]?.find(item => item.burnedBy !== post.account.hash160)) {
      pipeline.setbit(`lixilotus:bitmap:post:${post.id}`, 0, 1);
    }
  }

  await pipeline.exec();
  console.log('Finish');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prismaClient.$disconnect();
  });
