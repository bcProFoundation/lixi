import BCHJS from '@bcpros/xpi-js';
import { PrismaClient } from '@bcpros/lixi-prisma';

const prismaClient = new PrismaClient();
const XPI = new BCHJS({});

async function main() {
  //change all create-comment-fee account to 0 and dust
  const allAccount = await prismaClient.account.findMany({});

  for (const account of allAccount) {
    if (account.createCommentFee !== '0') {
      await prismaClient.account.update({
        where: { id: account.id },
        data: { createCommentFee: 'Dust' }
      });
    }
  }

  //change all create-comment-fee page to 0 and dust
  const allPage = await prismaClient.page.findMany({})

  for (const page of allPage) {
    if (page.createCommentFee !== '0') {
      await prismaClient.page.update({
        where: {id: page.id},
        data: {createCommentFee: 'Dust'}
      })
    }
  }
  console.log('Finish change create-comment-fee');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prismaClient.$disconnect();
  });
