import { ObjectType } from '@nestjs/graphql';

import { BasicPaginated, Paginated } from '../../../core';
import { Page } from '../page.model';

@ObjectType()
export class PageConnection extends Paginated(Page) {}

@ObjectType()
export class PageBasicConnection extends BasicPaginated(Page) {}
