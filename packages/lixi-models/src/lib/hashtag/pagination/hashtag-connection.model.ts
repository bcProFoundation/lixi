import { ObjectType } from '@nestjs/graphql';

import { Paginated } from '../../../core/pagination/pagination';
import { Hashtag } from '../hashtag.model';

@ObjectType()
export class HashtagConnection extends Paginated(Hashtag) {}
