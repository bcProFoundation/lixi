import { PrismaClient } from '@prisma/client';

const prismaClient = new PrismaClient();

async function main() {
  const allComment = await prismaClient.comment.findMany({});

  await Promise.all(
    allComment.map(async (item) => {
      return await prismaClient.commentClosure.upsert({
        where: { ancestor_descendant: { ancestor: item.id, descendant: item.id } },
        update: { depth: 0, commentId: item.id, ancestor: item.id, descendant: item.id },
        create: {
          ancestor: item.id,
          descendant: item.id,
          depth: 0,
          commentId: item.id
        }
      })
    })
  );

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
