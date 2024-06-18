import BCHJS from '@bcpros/xpi-js';
import { PrismaClient, AddressType } from '@bcpros/lixi-prisma';
import { walletPath, COIN } from '@bcpros/lixi-models';

const prismaClient = new PrismaClient();
const XPI = new BCHJS({});

async function main() {
  const allAccount = await prismaClient.account.findMany({include: {walletPaths: true}});

  for (const account of allAccount) {
    if (account.walletPaths.length === 0) {
      await prismaClient.account.update({
        where: { id: account.id },
        data: {
          walletPaths: {
            create: {
              path: walletPath.XPI,
              address: account.address,
              hash160: account.hash160.toString('hex') ?? null,
              publicKey: account.publicKey,
              type: AddressType.P2PKH,
              network: COIN.XPI
            }
          }
        }
      })
    }
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
