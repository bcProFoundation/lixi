import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { CloudflareImagesService } from 'src/common/modules/cloudflare/cloudflare-images.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UploadService implements OnModuleInit {
  private readonly logger = new Logger(UploadService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private prisma: PrismaService,
    private readonly cloudflareService: CloudflareImagesService
  ) {}

  onModuleInit() {
    // run every 10 minutes
    const job = new CronJob(`0 */10 * * * *`, async () => {
      this.logger.log('Checking database for unused image');

      const unusedUploadDetail = await this.prisma.uploadDetail.findMany({
        where: {
          AND: [
            {
              lixi: null
            },
            {
              pageCover: null
            },
            {
              pageAvatar: null
            },
            {
              post: null
            },
            {
              worshipedPersonAvatar: null
            },
            {
              templeAvatar: null
            },
            {
              templeCover: null
            },
            {
              avatarAccount: null
            },
            {
              coverAccount: null
            },
            {
              message: null
            },
            {
              comment: null
            }
          ]
        }
      });

      this.logger.log(`Found ${unusedUploadDetail.length} unused image`);

      if (unusedUploadDetail.length > 0) {
        this.logger.log('Removing unused image...');

        unusedUploadDetail.forEach(async uploadDetail => {
          const removedUpload = await this.prisma.$transaction(async prisma => {
            await prisma.uploadDetail.delete({
              where: {
                id: uploadDetail.id
              }
            });

            const result = await prisma.upload.delete({
              where: {
                id: uploadDetail.uploadId
              }
            });

            return result;
          });

          if (removedUpload.cfImageId) {
            await this.cloudflareService.deleteImage(removedUpload.cfImageId);
          }
        });

        this.logger.log('Done!');
      }
    });
    this.schedulerRegistry.addCronJob(`remove-unused-image`, job);
    job.start();
  }
}
