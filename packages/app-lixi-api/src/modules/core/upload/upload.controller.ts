import { Account, UPLOAD_TYPES } from '@bcpros/lixi-models';
import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { ApiConsumes } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Upload as UploadDb } from '@prisma/client';
import { FileInterceptor, FilesInterceptor } from '@webundsoehne/nest-fastify-file-upload';
import { MulterFile } from '@webundsoehne/nest-fastify-file-upload/dist/interfaces/multer-options.interface';
import { Requests } from 'cloudflare-images';
import { I18n, I18nContext } from 'nestjs-i18n';
import { extname } from 'path';
import sharp from 'sharp';
import { AccountEntity } from 'src/decorators';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwtauth.guard';
import { VError } from 'verror';
import { CloudflareImagesService } from '../../../common/modules/cloudflare/cloudflare-images.service';
import { PrismaService } from '../../prisma/prisma.service';
import { hexSha256 } from '../../../utils/encryptionMethods';
import { AccountCacheService } from '../../account/account-cache.service';

@SkipThrottle()
@Controller('uploads')
export class UploadFilesController {
  private logger: Logger = new Logger(UploadFilesController.name);

  constructor(
    private prisma: PrismaService,
    private readonly cloudflareService: CloudflareImagesService,
    private readonly accountCacheService: AccountCacheService
  ) {}

  @Post('/s3')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  async uploadS3(
    @UploadedFile('file') file: MulterFile,
    @AccountEntity() account: Account,
    @I18n() i18n: I18nContext,
    @Body() body: any
  ) {
    try {
      const { type } = body;
      if (!account) {
        const couldNotFindAccount = await i18n.t('lixi.messages.couldNotFindAccount');
        throw new Error(couldNotFindAccount);
      }

      const bucket = process.env.AWS_PUBLIC_BUCKET_NAME;
      const buffer = file.buffer;
      const sha = await hexSha256(buffer);
      const originalName = file.originalname.replace(/\.[^/.]+$/, '');
      const fileExtension = extname(file.originalname);
      const metadata = await sharp(file.buffer).metadata();

      const createImageRequest: Requests.CreateImage = {
        fileName: file.originalname,
        metadata: {
          width: metadata.width,
          height: metadata.height
        },
        requireSignedURLs: false
      };
      const createImageResponse = await this.cloudflareService.createImageFromBuffer(createImageRequest, buffer);

      const uploadToInsert = {
        sha: sha,
        originalFilename: originalName,
        createdAt: new Date(),
        updatedAt: new Date(),
        extension: fileExtension,
        type: type,
        bucket: bucket,
        width: metadata.width,
        height: metadata.height,
        cfImageId: createImageResponse.result.id,
        cfImageFilename: createImageResponse.result.filename
      };

      const resultImage: UploadDb = await this.prisma.upload.create({
        data: uploadToInsert
      });

      this.accountCacheService.removeByKey(account.id.toString());

      return resultImage;
    } catch (err) {
      if (err instanceof VError) {
        throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
      } else {
        const unableToUpload = await i18n.t('lixi.messages.unableToUpload');
        const error = new VError.WError(err as Error, unableToUpload);
        throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  @Delete('/remove-image-cf/:id')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  async removeImageCloudflare(@Param('id') id: string, @AccountEntity() account: Account, @I18n() i18n: I18nContext) {
    try {
      if (!account) {
        const couldNotFindAccount = await i18n.t('lixi.messages.couldNotFindAccount');
        throw new Error(couldNotFindAccount);
      }

      const upload = await this.prisma.upload.findUnique({
        where: {
          id: id
        },
        include: {
          imageUploadable: true
        }
      });

      if (account.id === upload?.imageUploadable?.accountId && upload) {
        await this.prisma.$transaction(async prisma => {
          await prisma.upload.delete({
            where: {
              id: upload!.id
            }
          });

          await prisma.imageUploadable.delete({
            where: {
              id: upload.imageUploadableId!
            }
          });

          return upload;
        });

        await this.cloudflareService.deleteImage(upload.cfImageId!);

        return;
      } else {
        const noPermission = i18n.t('account.messages.noPermission');
        throw new Error(noPermission);
      }
    } catch (err) {
      this.logger.error(err);
      if (err instanceof VError) {
        throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
      } else {
        const unableToRemoveUpload = i18n.t('account.messages.unableToRemoveUpload');
        const error = new VError.WError(err as Error, unableToRemoveUpload);
        throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  @Post('/s3-multiple')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('files'))
  @ApiConsumes('multipart/form-data')
  async uploadS3Multiple(
    @UploadedFile('files') files: Array<Express.Multer.File>,
    @AccountEntity() account: Account,
    @I18n() i18n: I18nContext,
    @Body() body: any
  ) {
    try {
      const { type } = body;
      if (!account) {
        const couldNotFindAccount = await i18n.t('lixi.messages.couldNotFindAccount');
        throw new Error(couldNotFindAccount);
      }

      const bucket = process.env.AWS_PUBLIC_BUCKET_NAME;
      let uploads = [];

      const promises = files.map(async (file: MulterFile) => {
        const buffer = file.buffer;
        const sha = await hexSha256(buffer);
        const originalName = file.originalname.replace(/\.[^/.]+$/, '');
        const fileExtension = extname(file.originalname);
        const metadata = await sharp(file.buffer).metadata();
        const createImageRequest: Requests.CreateImage = {
          fileName: file.originalname,
          metadata: {
            width: metadata.width,
            height: metadata.height
          },
          requireSignedURLs: false
        };
        const createImageResponse = await this.cloudflareService.createImageFromBuffer(createImageRequest, buffer);

        return {
          sha: sha,
          originalFilename: originalName,
          createdAt: new Date(),
          updatedAt: new Date(),
          extension: fileExtension,
          type: type,
          bucket: bucket,
          width: metadata.width,
          height: metadata.height,
          cfImageId: createImageResponse.result.id,
          cfImageFilename: createImageResponse.result.filename
        };
      });

      uploads = await Promise.all(promises);

      //Bypass because prisma doesn't return records after create many
      //https://github.com/prisma/prisma/issues/8131
      const resultImages = await this.prisma.$transaction(
        uploads.map(upload => this.prisma.upload.create({ data: upload }))
      );

      this.accountCacheService.removeByKey(account.id.toString());

      return resultImages;
    } catch (err) {
      if (err instanceof VError) {
        throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
      } else {
        const unableToUpload = await i18n.t('lixi.messages.unableToUpload');
        const error = new VError.WError(err as Error, unableToUpload);
        throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  @Post('/cf-multiple')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('files'))
  @ApiConsumes('multipart/form-data')
  async uploadCloudflareMultiple(
    @UploadedFile('files') files: Array<Express.Multer.File>,
    @AccountEntity() account: Account,
    @I18n() i18n: I18nContext,
    @Body() body: any
  ) {
    try {
      const { type, imageUploadableId } = body;
      if (!account) {
        const couldNotFindAccount = await i18n.t('lixi.messages.couldNotFindAccount');
        throw new Error(couldNotFindAccount);
      }

      const bucket = process.env.AWS_PUBLIC_BUCKET_NAME;
      let uploads = [];

      const promises = files.map(async (file: MulterFile) => {
        const buffer = file.buffer;
        const sha = await hexSha256(buffer);
        const originalName = file.originalname.replace(/\.[^/.]+$/, '');
        const fileExtension = extname(file.originalname);
        const metadata = await sharp(file.buffer).metadata();
        const createImageRequest: Requests.CreateImage = {
          fileName: file.originalname,
          metadata: {
            width: metadata.width,
            height: metadata.height
          },
          requireSignedURLs: false
        };
        const createImageResponse = await this.cloudflareService.createImageFromBuffer(createImageRequest, buffer);

        return {
          sha: sha,
          originalFilename: originalName,
          createdAt: new Date(),
          updatedAt: new Date(),
          extension: fileExtension,
          type: type,
          bucket: bucket,
          width: metadata.width,
          height: metadata.height,
          cfImageId: createImageResponse.result.id,
          cfImageFilename: createImageResponse.result.filename
        };
      });

      uploads = await Promise.all(promises);

      //Bypass because prisma doesn't return records after create many
      //https://github.com/prisma/prisma/issues/8131
      const resultImages = await this.prisma.$transaction(
        uploads.map(upload =>
          this.prisma.upload.create({
            data: {
              ...upload
            }
          })
        )
      );

      this.accountCacheService.removeByKey(account.id.toString());

      return resultImages;
    } catch (err) {
      if (err instanceof VError) {
        throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
      } else {
        const unableToUpload = await i18n.t('lixi.messages.unableToUpload');
        const error = new VError.WError(err as Error, unableToUpload);
        throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }
}
