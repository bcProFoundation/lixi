import { Field, Float, ObjectType } from '@nestjs/graphql';

import { Event } from './event.model';

@ObjectType()
export class EventDana {
  @Field(() => Float)
  danaBurnUp: number;

  @Field(() => Float)
  danaBurnDown: number;

  @Field(() => Float)
  danaBurnScore: number;

  @Field(() => Float)
  danaReceivedUp: number;

  @Field(() => Float)
  danaReceivedDown: number;

  @Field(() => Float)
  danaReceivedScore: number;

  @Field(() => Number)
  version: number;

  @Field(() => String)
  eventId: string;

  @Field(() => Event)
  event: Event;

  constructor(partial: Partial<EventDana>) {
    Object.assign(this, partial);
  }
}
