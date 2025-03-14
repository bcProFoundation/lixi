import { PrismaClient } from '@bcpros/lixi-prisma';
import ReSearch from '../../src/common/redis/redis-search'
import { Redis } from 'ioredis';
import * as _ from 'lodash';
import { IndexNameBuyOffer, IndexNameOffer} from '../../src/modules/escrow/escrow.contants';
require('dotenv').config();

const prismaClient = new PrismaClient();
const redis = new Redis({
  port: Number(process.env.REDIS_PORT) ?? 6379,
  host: process.env.REDIS_HOST
});

async function main() {
  const reSearch = new ReSearch(redis);
  const newField = {
    field: 'paymentApp',
    type: 'TEXT'
  }
  await reSearch.ensureFieldExistsInIndex(IndexNameOffer, newField.field, newField.type);
  await reSearch.ensureFieldExistsInIndex(IndexNameBuyOffer, newField.field, newField.type);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prismaClient.$disconnect();
    console.log("Finish!!")
  });
