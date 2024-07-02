import { ObjectType } from '@nestjs/graphql';

import { Paginated } from '../../../core/pagination/pagination';
import { FollowPage } from '../followPage.model';

@ObjectType()
export class FollowPageConnection extends Paginated(FollowPage) {}
