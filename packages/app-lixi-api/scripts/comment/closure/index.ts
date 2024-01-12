import { PrismaClient } from '@prisma/client';

const prismaClient = new PrismaClient();

async function main() {
  const allComment = await prismaClient.comment.findMany({});

  const dataCreateClosure = allComment.map(item => {
    return {
      ancestor: item.id,
      descendant: item.id,
      depth: 0,
      commentId: item.id
    };
  });

  await prismaClient.commentClosure.createMany({
    data: dataCreateClosure
  });

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
