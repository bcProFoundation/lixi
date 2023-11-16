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

      /*
        We dont need to check for unusedImageUploadable in imageUploadable  
        because we only create image uploadable when we create post, comment, message, etc...
        So if user delete image before creating post, comment, message, etc... then no imageUploadable will be created

        TLDR: We can delete straight from upload 
      */
      const unusedUploads = await this.prisma.upload.findMany({
        where: {
          imageUploadableId: null
        }
      });

      this.logger.log(`Found ${unusedUploads.length} unused image`);

      if (unusedUploads.length > 0) {
        this.logger.log('Removing unused image...');

        unusedUploads.forEach(async upload => {
          const removedUpload = await this.prisma.upload.delete({
            where: {
              id: upload.id
            }
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
