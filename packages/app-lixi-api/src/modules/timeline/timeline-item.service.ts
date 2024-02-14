import { Post, TimelineItem, TimelineItemData } from '@bcpros/lixi-models';
import { PostType } from '@bcpros/lixi-prisma';
import { Injectable, Logger } from '@nestjs/common';
import _ from 'lodash';
import { PostCacheService } from '../page/post-cache.service';

@Injectable()
export class TimelineItemService {
  private logger: Logger = new Logger(this.constructor.name);

  constructor(private readonly postCacheService: PostCacheService) {}

  async getById(id: string): Promise<Nullable<TimelineItem>> {
    const parts = id.split(':');
    const type = parts[0];
    switch (type) {
      case PostType.POST:
      default:
        const post = await this.postCacheService.getById(id);
        if (!post) return null;
        return new TimelineItem({
          id,
          data: post
        });
    }
  }

  async getByIds(timelineIds: string[]) {
    if (timelineIds.length === 0) return [];

    const itemsMap = new Map();
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
      const item: typeof TimelineItemData = itemsMap.get(id);
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
  }
}
