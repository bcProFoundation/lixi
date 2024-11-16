import { PrismaClient } from '@bcpros/lixi-prisma';
import moment from 'moment';
import { Redis } from 'ioredis';
import * as _ from 'lodash';
import {epoch} from '../../src/utils/constants'
require('dotenv').config();

const prismaClient = new PrismaClient();
const redis = new Redis({
  port: Number(process.env.REDIS_PORT) ?? 6379,
  host: process.env.REDIS_HOST
});

async function main() {
  const allOffer = await prismaClient.offer.findMany({
    include: {
      paymentMethods: {
        include: {
          paymentMethod: true
        }
      },
      post: true,
      location: true
    }
  });

  for (let i = 0; i < allOffer.length; i++) {
    const offer = allOffer[i];
    const diffHour = moment.duration(moment(offer.createdAt).diff(moment(epoch))).asHours();
    const score = 1 * Math.pow(2, diffHour / 12);
    const timelineId = `${offer.post.type}:${offer.postId}`;

    //add to home
    redis.zincrby('lixilotus:timeline:offer:boosting:showAll', score, timelineId);
  
    offer?.paymentMethods.map(item => {
      const keyPaymentMethod = `lixilotus:offer:method:{${item.paymentMethod.id}}`;
      redis.zincrby(keyPaymentMethod, score, timelineId);
    });

    if (offer?.location) {
      const keyCountry = `offer:country:{${offer.location.iso2}}`;
      redis.zincrby(keyCountry, score, timelineId);

      const keyState = `offer:state:{${offer.location.adminNameAscii}}`;
      redis.zincrby(keyState, score, timelineId);
    
      const keyCity = `offer:city:{${offer.location.cityAscii}}`;
      redis.zincrby(keyCity, score, timelineId);
    }

    if (offer?.coinPayment) {
      const keyCoin = `lixilotus:offer:coin:{${offer.coinPayment}}`;
      redis.zincrby(keyCoin, score, timelineId);
    }

    if (offer?.localCurrency) {
      const keyCurrency = `lixilotus:offer:currency:{${offer.localCurrency}}`;
      redis.zincrby(keyCurrency, score, timelineId);
    }
  }
  console.log("Finish!!")
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prismaClient.$disconnect();
  });
