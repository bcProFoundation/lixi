import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';

import { Account } from './account';
import { Comment } from './comment';
import { Event } from './event';
import { LixiModel } from './lixi/lixi.model';
import { Message } from './message';
import { Page } from './page';
import { Poll } from './poll';
import { Post } from './post';
import { Product } from './product';
import { Temple } from './temple';
import { Upload } from './upload';

@ObjectType()
export class ImageUploadable {
  @Field(() => ID)
  id: string;

  @Field(() => Account)
  account?: Account;

  @Field(() => [Upload])
  uploads: Upload[];

  @Field(() => Post, { nullable: true })
  post?: Nullable<Post>;

  @Field(() => Product, { nullable: true })
  product?: Nullable<Product>;

  @Field(() => LixiModel, { nullable: true })
  lixi?: Nullable<LixiModel>;

  @Field(() => Comment, { nullable: true })
  comment?: Nullable<Comment>;

  @Field(() => Message, { nullable: true })
  message?: Nullable<Message>;

  @Field(() => Event, { nullable: true })
  event?: Nullable<Event>;

  @Field(() => Poll, { nullable: true })
  poll?: Nullable<Poll>;

  @Field(() => Page, { nullable: true })
  pageAvatar?: Nullable<Page>;

  @Field(() => Page, { nullable: true })
  pageCover?: Nullable<Page>;

  @Field(() => Account, { nullable: true })
  accountAvatar?: Nullable<Account>;

  @Field(() => Account, { nullable: true })
  accountCover?: Nullable<Account>;

  @Field(() => Temple, { nullable: true })
  templeAvatar?: Nullable<Temple>;

  @Field(() => Temple, { nullable: true })
  templeCover?: Nullable<Temple>;

  @Field(() => ImageUploadableType, { nullable: true })
  type?: Nullable<ImageUploadableType>;

  constructor(partial: Partial<ImageUploadable>) {
    Object.assign(this, partial);
  }
}

export enum ImageUploadableType {
  ACCOUNT_AVATAR = 'ACCOUNT_AVATAR',
  ACCOUNT_COVER = 'ACCOUNT_COVER',
  PAGE_AVATAR = 'PAGE_AVATAR',
  PAGE_COVER = 'PAGE_COVER',
  POST = 'POST',
  COMMENT = 'COMMENT',
  LIXI = 'LIXI',
  TEMPLE_AVATAR = 'TEMPLE_AVATAR',
  TEMPLE_COVER = 'TEMPLE_COVER',
  MESSAGE = 'MESSAGE',
  EVENT = 'EVENT',
  POLL = 'POLL',
  PRODUCT = 'PRODUCT'
}

registerEnumType(ImageUploadableType, {
  name: 'ImageUploadableType',
  description: 'Properties by type of the image uploadable.'
});
