import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional } from 'class-validator';
@InputType()
export class CreateProductInput {
  @Field(() => String, { nullable: true })
  pageId?: string;

  @Field(() => Number, { nullable: true })
  categoryId?: number;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  uploads: [string];

  @Field(() => String)
  @IsNotEmpty()
  htmlContent: string;

  @Field(() => String)
  @IsNotEmpty()
  pureContent: string;

  @IsOptional()
  @Field(() => String, { nullable: true })
  createFeeHex?: Nullable<string>;

  @Field(() => Number)
  price: number;

  @Field(() => String)
  priceUnit: string;

  @Field(() => String, { nullable: true })
  phoneNumber: string;

  @Field(() => String, { nullable: true })
  name: string;

  @Field(() => String, { nullable: true })
  title: string;

  @Field(() => String, { nullable: true })
  description: string;
}
