import BCHJS from '@bcpros/xpi-js';
import { PrismaClient } from '@prisma/client'
const cashaddr =  require('ecashaddrjs')

const XPI = new BCHJS({})
const prismaClient = new PrismaClient();

async function main() {
    const allAccounts = await prismaClient.account.findMany({include: {accountAddress: true}});
    
    for (const account of allAccounts) {
      if (account.accountAddress) continue;

      const cashAddress = XPI.Address.toCashAddress(account.address);

      const {type, hash} = cashaddr.decode(cashAddress)
      const xecAddress = cashaddr.encode('ecash', type, hash);

      await prismaClient.account.update({
         where: { id: account.id },
         data: {
            accountAddress: {
               create: {
                  xpiAddress: account.address,
                  xpiAddressHash160: account.hash160,
                  xecAddress,
                  publicKey: account.publicKey
               }
            }
       }
      });
    }

   console.log("Finish create new model AccountAddress");
}

main()
 .catch(e => {
    console.log(e);
    process.exit(1);
 })
 .finally(async() => {
    await prismaClient.$disconnect();
 })
