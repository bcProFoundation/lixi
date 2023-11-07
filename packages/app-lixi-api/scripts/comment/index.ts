import { PrismaClient, BurnType as BurnTypePrisma, AccountDanaHistoryType } from '@prisma/client';
import BCHJS from '@bcpros/xpi-js';

require('dotenv').config();

const prismaClient = new PrismaClient();



async function main() {

  // Get the posts in batch fo 1000 items each time
  let postProcessed = 0;

  const postCount = await prismaClient.post.count({});
  const posts = await prismaClient.post.findMany({
    orderBy: {
      id: 'asc'
    }
  });

  const commentableCount = await prismaClient.commentable.createMany({
    data: [
      ...posts.map(post => {
        return {
          type: 'Post',
        }
      })
    ]
  });

  const commentables = await prismaClient.commentable.findMany({
    orderBy: {
      id: 'asc'
    }
  });

  for (let i = 0; i < posts.length; i++) {
    if (posts[i] && commentables[i]) {
      await prismaClient.$transaction(async (prisma) => {
        const post = await prisma.post.update({
          where: {
            id: posts[i].id
          },
          data: {
            commentableId: commentables[i].id
          }
        });
        await prisma.comment.updateMany({
          data: {
            commentableId: commentables[i].id
          },
          where: {
            commentToId: posts[i].id
          }
        })
      })

      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}


main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prismaClient.$disconnect();
  });
