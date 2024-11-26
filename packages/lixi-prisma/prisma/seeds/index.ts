import { envelopes } from './envelopes';
import { notificationTypes } from './notificationTypes';
import { notificationTypeTranslations } from './notificationTypeTranslations';

import { PrismaClient } from '@prisma/client';
import { emailTemplates } from './emailTemplates';
import { emailTemplateTranslations } from './emailTemplateTranslations';
import { categories } from './categories';
import { worshipedPersonInVietNam } from './worship/vietnam';
import { paymentMethod } from './paymentMethod';

import fs from 'fs';
import path, { join } from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { pipeline } from 'stream';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

async function main() {
  const resultEnvelopes = await prisma.$transaction(
    envelopes.map(envelope =>
      prisma.envelope.upsert({
        where: { id: envelope.id },
        update: {},
        create: { ...envelope }
      })
    )
  );

  const resultNotifTypes = await prisma.$transaction(
    notificationTypes.map(notificationType =>
      prisma.notificationType.upsert({
        where: { id: notificationType.id },
        update: {},
        create: { ...notificationType }
      })
    )
  );

  const resultNotifTypesTranslation = await prisma.$transaction(
    notificationTypeTranslations.map(notificationTypeTranslation =>
      prisma.notificationTypeTranslation.upsert({
        where: { id: notificationTypeTranslation.id },
        update: { ...notificationTypeTranslation },
        create: { ...notificationTypeTranslation }
      })
    )
  );

  const resultEmailTemplate = await prisma.$transaction(
    emailTemplates.map(item =>
      prisma.emailTemplate.upsert({
        where: { id: item.id },
        update: {},
        create: { ...item }
      })
    )
  );

  const resultEmailTemplateTranslation = await prisma.$transaction(
    emailTemplateTranslations.map(translation => {
      return prisma.emailTemplateTranslation.upsert({
        where: { id: translation.id },
        update: {},
        create: { ...translation }
      });
    })
  );

  const resultCategory = await prisma.$transaction(
    categories.map(translation => {
      return prisma.category.upsert({
        where: { id: translation.id },
        update: { ...translation },
        create: { ...translation }
      });
    })
  );

  // add paymentMethod
  await prisma.$transaction(
    paymentMethod.map(payment => {
      return prisma.paymentMethod.upsert({
        where: { id: payment.id },
        update: { ...payment },
        create: { ...payment }
      });
    })
  );

  const worshipedPeople = await prisma.worshipedPerson.createMany({
    data: worshipedPersonInVietNam.map((person) => {
      return {
        name: person.PersonName,
        wikiDataId: person.Person.split("/").pop(),
        countryOfCitizenship: person.CountryOfCitizenshipLabel,
        religion: person.ReligionLabel,
        dateOfBirth: person.DateOfBirth,
        placeOfBirth: person.PlaceOfBirthLabel,
        dateOfDeath: person.DateOfDeath,
        placeOfDeath: person.PlaceOfDeathLabel,
        placeOfBurial: person.PlaceOfBurialLabel,
        achievement: person.PersonDescription,
        alias: person.PersonAlias,
        wikiAvatar: person.Image,
        dayOfBirth: person.DateOfBirth ? new Date(person.DateOfBirth).getDate() : null,
        monthOfBirth: person.DateOfBirth ? new Date(person.DateOfBirth).getMonth() + 1 : null,
        yearOfBirth: person.DateOfBirth ? new Date(person.DateOfBirth).getFullYear() : null,
        dayOfDeath: person.DateOfDeath ? new Date(person.DateOfDeath).getDate() : null,
        monthOfDeath: person.DateOfDeath ? new Date(person.DateOfDeath).getMonth() + 1 : null,
        yearOfDeath: person.DateOfDeath ? new Date(person.DateOfDeath).getFullYear() : null,
      }
    }),
    skipDuplicates: true,
  })

  const dataWorldCities = await prisma.seedVersion.findFirst({
    where: {
      name: '1732246093_seed_worldCities'
    }
  })

  if (!dataWorldCities) {

    const tarFilePath = path.join(__dirname, '../data/worldcities.tar.gz');
    const tempDir = os.tmpdir();
    const tempCsvFilePath = path.join(tempDir, 'worldcities.csv');

    // Check if the tar.gz file exists
    if (!fs.existsSync(tarFilePath)) {
      throw new Error('worldcities.tar.gz file not found');
    }

    // Create the data directory if it doesn't exist
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Extract the tar.gz file using the tar command
    try {
      await execAsync(`tar -xzf ${tarFilePath} -C ${path.join(tempDir)}`);
    } catch (error) {
      throw new Error(`Failed to extract worldcities.tar.gz using tar: ${error.message}`);
    }

    const query = `
        COPY world_cities (city, city_ascii, city_alt, lat, lng, country, iso2, iso3, admin_name, admin_name_ascii, admin_code, admin_type, capital, density, population, population_proper, ranking, timezone, same_name, id)
        FROM '${tempCsvFilePath}'
        DELIMITER ','
        CSV HEADER
        ENCODING 'UTF8';
    `;

    await prisma.$queryRawUnsafe(query);

    //create data
    await prisma.seedVersion.create({
      data: {
        name: '1732246093_seed_worldCities'
      }
    })

    //remove file in tmp
    fs.unlinkSync(tempCsvFilePath);
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
