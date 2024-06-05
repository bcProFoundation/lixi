import { Field, Float, ID, ObjectType } from '@nestjs/graphql';
import { Decimal } from '@prisma/client/runtime/library.js';
// import { Decimal } from '@prisma/client/runtime/index.js';
import { Transform, Type } from 'class-transformer';
import { IsOptional } from 'class-validator';
import { GraphQLDateTime } from 'graphql-scalars';
import { GraphQLDecimal, transformToDecimal } from 'prisma-graphql-type-decimal';

import { Account } from '../account/account.model';
import { Temple } from '../temple/temple.model';

import { WorshipedPerson } from './worshipedPerson.model';

@ObjectType()
export class Worship {
  @Field(() => ID)
  id: string;

  @Field(() => Account)
  account: Account;

  @Field(() => WorshipedPerson, { nullable: true })
  @IsOptional()
  worshipedPerson?: WorshipedPerson;

  @Field(() => Temple, { nullable: true })
  @IsOptional()
  temple?: Temple;

  @Field(() => Float)
  worshipedAmount: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  location?: string;

  @Field(() => GraphQLDecimal, { nullable: true })
  @IsOptional()
  @Type(() => Object)
  @Transform(transformToDecimal)
  latitude?: Decimal;

  @Field(() => GraphQLDecimal, { nullable: true })
  @Type(() => Object)
  @IsOptional()
  @Transform(transformToDecimal)
  longitude?: Decimal;

  @Field(() => GraphQLDateTime, {
    description: 'Identifies the date and time when the object was created.'
  })
  createdAt: Date;

  @Field(() => GraphQLDateTime, {
    description: 'Identifies the date and time when the object was last updated.'
  })
  updatedAt: Date;
}
