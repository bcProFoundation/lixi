import { PrismaClient } from '@bcpros/lixi-prisma';
import { scanAndCollectKeys } from '../../offer/reset-escrow/index';
import { Redis } from 'ioredis';
import * as _ from 'lodash';
require('dotenv').config();

const prismaClient = new PrismaClient();
const redis = new Redis({
  port: Number(process.env.REDIS_PORT) ?? 6379,
  host: process.env.REDIS_HOST
});

async function main() {
  //get from args in terminal
  const accountIdDeleted = Number(process.argv[2] ?? '0');

  //get commentIds first to delete commentDana
  const allComments = await prismaClient.comment.findMany({
    select: {
      id: true
    },
    where: {
        commentAccountId: accountIdDeleted
    }
  });
  
  //remove comment-dana first
  await prismaClient.commentDana.deleteMany({
    where: {
      commentId: {
        in: allComments.map(item => item.id)
      }
    }
  });

  //remove comment
  await prismaClient.comment.deleteMany({
    where: {
      commentAccountId: accountIdDeleted
    }
  });

  //get all postIds to delete cache
  const allPosts = await prismaClient.post.findMany({
    select: {
      id: true
    },
    where: {
      accountId: accountIdDeleted
    }
  });

  //remove post
  await prismaClient.post.deleteMany({
    where: {
      id: {
        in: allPosts.map(item => item.id)
      }
    }
  });

  const idInCaches = allPosts.map(item => `POST:${item.id}`);

  //iterate all cache and delete specific item
  const keyTimelines = await scanAndCollectKeys('*timeline*')
 
  for (const key of keyTimelines) {
    await redis.zrem(key, ...idInCaches);
  }

  console.log('Finish!!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prismaClient.$disconnect();
  });
