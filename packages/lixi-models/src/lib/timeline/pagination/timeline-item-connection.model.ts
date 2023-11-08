import { ObjectType } from '@nestjs/graphql';

import { BasicPaginated } from '../../../core';
import { TimelineItem } from '../timeline-item.model';

@ObjectType()
export class TimelineItemConnection extends BasicPaginated(TimelineItem) {}
