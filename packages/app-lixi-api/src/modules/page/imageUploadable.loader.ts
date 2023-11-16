import { ICommentableTo, IImageUploadableTo } from '@bcpros/lixi-models';
import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import _ from 'lodash';
import { PrismaService } from '../prisma/prisma.service';

@Injectable({ scope: Scope.REQUEST })
export default class ImageUploadableLoader {
  constructor(private readonly prisma: PrismaService) {}

  public readonly batchImageUploadable = new DataLoader(
    async (imageUploadableToArr: readonly IImageUploadableTo[]) => {
      const imageUploadableIds = _.compact(
        imageUploadableToArr.map(imageUploadableTo => imageUploadableTo.imageUploadableId)
      );

      const totalImageUploadable = await this.prisma.imageUploadable.findMany({
        where: {
          id: {
            in: imageUploadableIds
          }
        },
        include: {
          uploads: true
        }
      });

      // combine totalImageUploadable and imageUploadableToArr to single array
      const totalImageUploadableMap = new Map(
        totalImageUploadable.map(value => {
          return [value.id, value];
        })
      );

      return imageUploadableToArr.map(imageUploadableTo => {
        return imageUploadableTo?.imageUploadableId
          ? totalImageUploadableMap.get(imageUploadableTo?.imageUploadableId)
          : null;
      });
    },
    {
      cacheKeyFn: (imageUploadableTo: IImageUploadableTo) =>
        `${imageUploadableTo.id}:${imageUploadableTo.imageUploadableId}`
    }
  );
}
