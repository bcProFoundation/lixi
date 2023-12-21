import { ObjectType } from '@nestjs/graphql';

import { BasicPaginated } from '../core';

import { BurnItem } from './burn-item.model';

@ObjectType()
export class BurnBasicConnection extends BasicPaginated(BurnItem) {}
