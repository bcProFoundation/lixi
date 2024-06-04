import { ObjectType } from '@nestjs/graphql';

import { BasicPaginated } from '../../../core/pagination/basic.paginated.type';
import { Paginated } from '../../../core/pagination/pagination';
import { Account } from '../account.model';

@ObjectType()
export class AccountConnection extends Paginated(Account) {}

@ObjectType()
export class AccountBasicConnection extends BasicPaginated(Account) {}
