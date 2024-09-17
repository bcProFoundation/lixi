import { Dispute, EscrowOrder, Post, TIMELINE_TYPE, TimelineItem, TimelineItemData } from '@bcpros/lixi-models';
import { PostType } from '@bcpros/lixi-prisma';
import { Injectable, Logger } from '@nestjs/common';
import _ from 'lodash';
import { PostCacheService } from '../page/post-cache.service';
import { EscrowOrderCacheService } from '../escrow/escrow-order/escrow-order-cache.service';
import { DisputeCacheService } from '../escrow/dispute/dispute-cache.service';

@Injectable()
export class TimelineItemService {
  private logger: Logger = new Logger(this.constructor.name);

  constructor(
    private readonly postCacheService: PostCacheService,
    private readonly escrowOrderCacheService: EscrowOrderCacheService,
    private readonly disputeCacheService: DisputeCacheService
  ) {}

  async getById(id: string, timelineItemType = TIMELINE_TYPE.POST): Promise<Nullable<TimelineItem>> {
    switch (timelineItemType) {
      case TIMELINE_TYPE.POST:
        const parts = id.split(':');
        const post = await this.postCacheService.getById(parts[1]);
        if (!post) return null;
        return new TimelineItem({
          id,
          data: post
        });
      case TIMELINE_TYPE.ESCROWORDER:
        const escrowOrder = await this.escrowOrderCacheService.getById(id);
        if (!escrowOrder) return null;
        return new TimelineItem({
          id,
          data: escrowOrder
        });
      case TIMELINE_TYPE.DISPUTE:
        const dispute = await this.disputeCacheService.getById(id);
        if (!dispute) return null;
        return new TimelineItem({
          id,
          data: dispute
        });
    }
    return new TimelineItem({ id });
  }

  async getByIds(timelineIds: string[], timelineItemType = TIMELINE_TYPE.POST) {
    if (timelineIds.length === 0) return [];

    const itemsMap = new Map();

    switch (timelineItemType) {
      case TIMELINE_TYPE.POST:
        const objIds = timelineIds.map(timelineId => {
          const parts = timelineId.split(':');
          return {
            type: parts[0],
            id: parts[1]
          };
        });
        const groups = _.groupBy(objIds, 'type');
        for (const group of _.keys(groups)) {
          const posts = await this.postCacheService.getByIds(_.map(groups[group], 'id'));
          for (const post of posts) {
            if (post) {
              itemsMap.set(`${post.type}:${post.id}`, post);
            }
          }
        }

        return timelineIds.map(id => {
          const item: Post = itemsMap.get(id);
          return item
            ? new TimelineItem({
                id,
                data: new Post({ ...item }) as Post
              })
            : new TimelineItem({
                id,
                data: new Post({})
              });
        });
      case TIMELINE_TYPE.ESCROWORDER:
        const orderEscrows = await this.escrowOrderCacheService.getByIds(timelineIds);
        for (const orderEscrow of orderEscrows) {
          if (orderEscrow) {
            itemsMap.set(orderEscrow.id, orderEscrow);
          }
        }
        return timelineIds.map(id => {
          const item: EscrowOrder = itemsMap.get(id);
          return item
            ? new TimelineItem({
                id,
                data: new EscrowOrder({ ...item }) as EscrowOrder
              })
            : new TimelineItem({
                id,
                data: new EscrowOrder({})
              });
        });
      case TIMELINE_TYPE.DISPUTE:
        const disputes = await this.disputeCacheService.getByIds(timelineIds);
        for (const dispute of disputes) {
          if (dispute) {
            itemsMap.set(dispute.id, dispute);
          }
        }
        return timelineIds.map(id => {
          const item: Dispute = itemsMap.get(id);
          return item
            ? new TimelineItem({
                id,
                data: new Dispute({ ...item }) as Dispute
              })
            : new TimelineItem({
                id,
                data: new Dispute({})
              });
        });
    }

    return [];
  }
}
