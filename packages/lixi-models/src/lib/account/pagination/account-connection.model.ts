import { ObjectType } from '@nestjs/graphql';

import { BasicPaginated, Paginated } from '../../../core';
import { Account } from '../account.model';

@ObjectType()
export class AccountConnection extends Paginated(Account) {}

@ObjectType()
export class AccountBasicConnection extends BasicPaginated(Account) {}
