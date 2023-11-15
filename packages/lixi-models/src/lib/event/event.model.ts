import { Field, Float, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';
import { GraphQLDateTime } from 'graphql-scalars';

import { Account } from '../account';
import { ImageUploadable } from '../imageUploadable';
import { Page } from '../page';

import { EventDana } from './event-dana.model';

@ObjectType()
export class Event {
  @Field(() => ID)
  id: string;

  @Field(() => Number)
  accountId: number;

  @Field(() => Account)
  account: Account;

  @Field(() => String)
  name: string;

  @Field(() => String)
  description: string;

  @IsOptional()
  @Field(() => Page, { nullable: true })
  page?: Nullable<Page>;

  @IsOptional()
  @Field(() => String, { nullable: true })
  pageId?: Nullable<string>;

  @Field(() => GraphQLDateTime)
  startDate: Date;

  @Field(() => GraphQLDateTime)
  endDate: Date;

  @Field(() => String, { nullable: true })
  location?: Nullable<string>;

  @Field(() => EventType)
  eventType: EventType;

  @Field(() => Number, { nullable: true })
  totalComments?: Nullable<number>;

  @Field(() => Float, { nullable: true })
  danaViewScore?: Nullable<number>;

  @Field(() => ImageUploadable, { nullable: true })
  imageUploadable?: Nullable<ImageUploadable>;

  @Field(() => EventDana)
  dana?: Nullable<EventDana>;

  @Field(() => GraphQLDateTime, {
    description: 'Identifies the date and time when the object was created.'
  })
  createdAt: Date;

  @Field(() => GraphQLDateTime, {
    description: 'Identifies the date and time when the object was last updated.'
  })
  updatedAt: Date;

  constructor(partial: Partial<Event>) {
    Object.assign(this, partial);
  }
}

export enum EventType {
  VIRTUAL = 'VIRTUAL',
  PHYSICAL = 'PHYSICAL'
}

registerEnumType(EventType, {
  name: 'EventType',
  description: 'The type of event.'
});
