import BCHJS from '@bcpros/xpi-js';
import { PrismaClient } from '@bcpros/lixi-prisma';

const prismaClient = new PrismaClient();
const XPI = new BCHJS({});

async function main() {
  const allNotification = await prismaClient.notificationTypeTranslation.findMany({});

  const lengthAllNotification = allNotification.length;
  for (let i = 0; i < lengthAllNotification; i++) {
    if (allNotification[i].template.includes("XPI"))
    {
      await prismaClient.notificationTypeTranslation.update({
        where: {id: allNotification[i].id},
        data: {
          template: allNotification[i].template.replace(/XPI/g, '{{coin}}')
        }
      })
    }
  }

  console.log('Finish change notification');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prismaClient.$disconnect();
  });
