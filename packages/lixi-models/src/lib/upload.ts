import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class UploadDetail {
  @Field(() => ID)
  id: string;

  @Field(() => Upload)
  upload: Upload;
}

@ObjectType()
export class Upload {
  @Field(() => ID)
  id: string;

  originalFilename: string;
  fileSize?: number;

  @Field(() => Number, { nullable: true })
  width?: Nullable<number>;

  @Field(() => Number, { nullable: true })
  height?: Nullable<number>;

  url?: string;
  createdAt?: Date;
  updatedAt?: Date;

  @Field(() => String)
  sha: string;

  @Field(() => String, { nullable: true })
  sha800?: string;

  @Field(() => String, { nullable: true })
  sha320?: string;

  @Field(() => String, { nullable: true })
  sha40: string;

  @Field(() => String, { nullable: true })
  cfImageId?: Nullable<string>;

  @Field(() => String, { nullable: true })
  cfImageFilename?: Nullable<string>;

  @Field(() => String, { nullable: true })
  extension?: Nullable<string>;

  @Field(() => Number, { nullable: true })
  thumbnailWidth?: Nullable<number>;

  @Field(() => Number, { nullable: true })
  thumbnailHeight?: Nullable<number>;

  @Field(() => String, { nullable: true })
  type?: Nullable<string>;

  @Field(() => String, { nullable: true })
  bucket?: Nullable<string>;

  constructor(partial: Partial<Upload>) {
    Object.assign(this, partial);
  }
}
