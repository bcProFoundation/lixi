import { ObjectType } from '@nestjs/graphql';

import { BasicPaginated } from '../core/pagination/basic.paginated.type';

import { BurnItem } from './burn-item.model';

@ObjectType()
export class BurnBasicConnection extends BasicPaginated(BurnItem) { }
