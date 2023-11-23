import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional } from 'class-validator';
import { GraphQLDateTime } from 'graphql-scalars';

import { EventType } from '../event.model';

@InputType()
export class CreateEventInput {
  @Field(() => String)
  name: string;

  @Field(() => String)
  @IsNotEmpty()
  htmlContent: string;

  @Field(() => String)
  @IsNotEmpty()
  pureContent: string;

  @IsOptional()
  @Field(() => String, { nullable: true })
  pageId?: Nullable<string>;

  @IsOptional()
  @Field(() => String, { nullable: true })
  tokenId?: Nullable<string>;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  uploads: [string];

  @Field(() => GraphQLDateTime)
  startDate: Date;

  @Field(() => GraphQLDateTime)
  endDate: Date;

  @IsOptional()
  @Field(() => String, { nullable: true })
  location?: Nullable<string>;

  @IsOptional()
  @Field(() => String, { nullable: true })
  createFeeHex?: Nullable<string>;

  @Field(() => EventType)
  eventType: EventType;
}
