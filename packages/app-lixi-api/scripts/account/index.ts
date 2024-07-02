import BCHJS from '@bcpros/xpi-js';
import { PrismaClient } from '@bcpros/lixi-prisma';

const prismaClient = new PrismaClient();
const XPI = new BCHJS({});

async function main() {
  const allAccount = await prismaClient.account.findMany({});

  for (const account of allAccount) {
    await prismaClient.account.update({
      where: { id: account.id },
      data: { hash160: Buffer.from(XPI.Address.toHash160(account.address), 'hex') }
    });
  }

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
