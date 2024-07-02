import { ObjectType } from '@nestjs/graphql';

import { BasicPaginated } from '../../../core/pagination/basic.paginated.type';
import { Paginated } from '../../../core/pagination/pagination';
import { Page } from '../page.model';

@ObjectType()
export class PageConnection extends Paginated(Page) {}

@ObjectType()
export class PageBasicConnection extends BasicPaginated(Page) {}
