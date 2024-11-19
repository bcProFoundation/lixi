import { PrismaClient } from '@bcpros/lixi-prisma';
import { MeiliSearch } from 'meilisearch';
require('dotenv').config();

const prisma = new PrismaClient();
const meiliClient = new MeiliSearch({ host: process.env.MEILISEARCH_HOST!, apiKey: process.env.MEILISEARCH_MASTER_KEY });

async function main() {
   console.log(`Indexing database to meilisearch bucket: ${process.env.MEILISEARCH_BUCKET}`)
   const locations = await prisma.worldcities.findMany({
      select: {
         country: true,
         iso2: true,
         adminNameAscii: true,
         adminCode: true,
         cityAscii: true,
         id: true
      }
   })

   const indexedLocations = locations.map(location => ({
      id: location.id,
      country: location.country,
      iso2: location.iso2,
      adminNameAscii: location.adminNameAscii,
      adminCode: location.adminCode,
      cityAscii: location.cityAscii
    }));
    
   // Batch index data to avoid payload size limit
   const batchSize = 1000; // Adjust based on document size
   for (let i = 0; i < indexedLocations.length; i += batchSize) {
      console.log("index to: ", i)
      const batch = indexedLocations.slice(i, i + batchSize);
      await meiliClient.index(`${process.env.MEILISEARCH_BUCKET}_locations`).addDocuments(batch, { primaryKey: 'id' });
   }
}

main()
   .catch(e => {
      console.error(e);
      process.exit(1);
   })
   .finally(async () => {
      await prisma.$disconnect();
   });
