import { createUnionType, Field, ID, ObjectType } from '@nestjs/graphql';

import { Post } from '../post/post.model';
import { EscrowOrder } from '../escrow/escrow-order.model';
import { Dispute } from '../escrow/dispute.model';

export const TimelineItemData = createUnionType({
  name: 'TimelineItemData',
  types: () => [Post, EscrowOrder, Dispute] as const,
  resolveType(value) {
    switch (value.constructor.name) {
      case 'Post':
        return Post;
      case 'EscrowOrder':
        return EscrowOrder;
      case 'Dispute':
        return Dispute;
      default:
        return Post;
    }
  }
});

@ObjectType()
export class TimelineItem {
  @Field(() => ID)
  id: string;

  @Field(() => TimelineItemData)
  data: typeof TimelineItemData;

  constructor(partial: Partial<TimelineItem>) {
    Object.assign(this, partial);
  }
}
