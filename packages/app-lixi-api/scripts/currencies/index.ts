import BCHJS from '@bcpros/xpi-js';
import { PrismaClient } from '@bcpros/lixi-prisma';
import { LIST_CURRENCIES_USED } from '../../src/utils/constants'

const prismaClient = new PrismaClient();
const XPI = new BCHJS({});

async function main() {
  for (let i = 0; i < LIST_CURRENCIES_USED.length; i++) {
    const currentCurrency = LIST_CURRENCIES_USED[i];
    await prismaClient.currencies.updateMany({
      where: {
        code: currentCurrency.code
      },
      data: {
        name: currentCurrency.name,
        isSupport: true
      }
    })
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
