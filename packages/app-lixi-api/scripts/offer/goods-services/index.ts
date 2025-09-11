import { PrismaClient } from '@bcpros/lixi-prisma';
import { Redis } from 'ioredis';
import * as _ from 'lodash';
require('dotenv').config();

const prismaClient = new PrismaClient();
const redis = new Redis({
  port: Number(process.env.REDIS_PORT) ?? 6379,
  host: process.env.REDIS_HOST
});

async function main() {
    const offersToUpdate = await prismaClient.offer.findMany({
    where: {
        AND: [
        {
            paymentMethods: {
                every: {
                    paymentMethodId: 5 //GOODS_SERVICES
                }
            }
        },
        {
            priceGoodsServices: 0
        },
        {
            tickerPriceGoodsServices: null
        }
        ]
    },
    select: {
        postId: true,
        orderLimitMin: true,
        orderLimitMax: true,
        priceGoodsServices: true
    }
    });

    console.log("🚀 ~ offersToUpdate:", offersToUpdate.length);

    // Update each offer individually since we need to calculate max/min for each
    const updatePromises = offersToUpdate.map(offer => {
    const min = offer?.orderLimitMin ?? 1;
    const newMax = Math.floor((offer?.orderLimitMax ?? 0) / min); // Get integer division
    
    return prismaClient.offer.update({
        where: {
            postId: offer.postId
        },
        data: {
            orderLimitMin: offer?.orderLimitMin === null ? null : 1,
            orderLimitMax: offer?.orderLimitMax === null ? null : newMax,
            priceGoodsServices: min,
            tickerPriceGoodsServices: "XEC"
        }
    });
    });

    await Promise.all(updatePromises);
    await redis.del('lixilotus:items:offers:item-data');
    
    console.log("Finish")
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prismaClient.$disconnect();
  });
