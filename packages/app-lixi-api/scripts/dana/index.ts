import { PrismaClient } from '@prisma/client';
import BCHJS from '@bcpros/xpi-js';

require('dotenv').config();

const prismaClient = new PrismaClient();
const XPI = new BCHJS({ restURL: 'https://api.sendlotus.com/v4/' });

enum BurnForType {
  Page = 24321,
  Post = 24322,
  Comment = 24323,
  Account = 24324,
  Token = 24325,
  Worship = 24326
}

enum BurnType {
  Up = 1,
  Down = 0
}

const convertBurnedByToAddress = (burnedBy: string): string => {
  const legacyAddress = XPI.Address.hash160ToLegacy(burnedBy);

  const publicAddress = XPI.Address.toXAddress(legacyAddress);

  return publicAddress;
};

const updateAccountsDana = async (
  burnType: BurnType,
  amount: number,
  givenDanaAddress?: string,
  receivedDanaAddress?: string,
  isUpvote?: boolean
) => {
  //Check if self burn
  if (givenDanaAddress === receivedDanaAddress) {
    console.log('self burn');
    await prismaClient.$transaction(async prisma => {
      const account = await prisma.account.findFirst({
        where: {
          address: givenDanaAddress
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      const danaGiven = account?.danaGiven! + amount;
      const totalDana = danaGiven + account?.danaReceived!;

      await prisma.account.update({
        where: {
          id: account?.id
        },
        data: {
          danaGiven: danaGiven,
          totalDana: totalDana
        }
      });
    });
  } else {
    await prismaClient.$transaction(async prisma => {
      //update given account
      console.log('burn for other');

      const givenDanaAccount = await prisma.account.findFirst({
        where: {
          address: givenDanaAddress
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      const danaGivenAccount = givenDanaAccount?.danaGiven! + amount;
      const totalDanaGivenAccount = danaGivenAccount + givenDanaAccount?.danaReceived!;

      await prisma.account.update({
        where: {
          id: givenDanaAccount?.id
        },
        data: {
          danaGiven: danaGivenAccount,
          totalDana: totalDanaGivenAccount
        }
      });

      //update received account
      const receivedDanaAccount = await prisma.account.findFirst({
        where: {
          address: receivedDanaAddress
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      const danaReceived =
        burnType === BurnType.Up
          ? receivedDanaAccount?.danaReceived! + amount
          : receivedDanaAccount?.danaReceived! - amount;
      const totalDanaReceivedAccount = danaReceived + receivedDanaAccount?.danaGiven!;

      await prisma.account.update({
        where: {
          id: receivedDanaAccount?.id
        },
        data: {
          danaReceived: danaReceived,
          totalDana: totalDanaReceivedAccount
        }
      });
    });
  }
};

async function main() {
  console.log(`Calculating dana for all accounts based on burn table`);
  const burns = await prismaClient.burn.findMany({});
  for (const burn of burns) {
    let burnAddress = '';
    const burnType = burn.burnType === true ? BurnType.Up : BurnType.Down;
    const burnForType = burn.burnForType;
    switch (burnForType) {
      case BurnForType.Post:
        burnAddress = convertBurnedByToAddress(burn.burnedBy.toString('hex'));
        const post = await prismaClient.post.findUnique({
          where: { id: burn.burnForId },
          include: {
            postAccount: {
              select: {
                address: true
              }
            }
          }
        });
        await updateAccountsDana(burnType, burn.burnedValue, burnAddress, post?.postAccount.address);
        break;
      case BurnForType.Comment:
        burnAddress = convertBurnedByToAddress(burn.burnedBy.toString('hex'));
        const comment = await prismaClient.comment.findUnique({
          where: { id: burn.burnForId },
          include: {
            commentAccount: {
              select: {
                address: true
              }
            }
          }
        });
        await updateAccountsDana(burnType, burn.burnedValue, burnAddress, comment?.commentAccount!.address);

        break;
      case BurnForType.Token:
        burnAddress = convertBurnedByToAddress(burn.burnedBy.toString('hex'));
        const burnAccount = await prismaClient.account.findFirst({
          where: {
            address: burnAddress
          },
          orderBy: {
            createdAt: 'desc'
          }
        });

        const danaGiven = burnAccount?.danaGiven! + burn.burnedValue;
        const totalDana = danaGiven + burnAccount?.danaReceived!;

        await prismaClient.account.update({
          where: {
            id: burnAccount?.id
          },
          data: {
            danaGiven,
            totalDana
          }
        });

        break;
    }

    //sleep for 2 seconds
    console.log(`Sleeping for 2 seconds`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`Done`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prismaClient.$disconnect();
  });
