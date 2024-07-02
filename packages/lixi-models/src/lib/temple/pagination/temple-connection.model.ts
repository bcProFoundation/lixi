import { ObjectType } from '@nestjs/graphql';

import { Paginated } from '../../../core/pagination/pagination';
import { Temple } from '../temple.model';

@ObjectType()
export class TempleConnection extends Paginated(Temple) {}
