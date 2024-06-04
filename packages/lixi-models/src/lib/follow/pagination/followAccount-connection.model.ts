import { ObjectType } from '@nestjs/graphql';

import { Paginated } from '../../../core/pagination/pagination';
import { FollowAccount } from '../followAccount.model';

@ObjectType()
export class FollowAccountConnection extends Paginated(FollowAccount) {}
