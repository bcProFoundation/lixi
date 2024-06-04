import { ObjectType } from '@nestjs/graphql';

import { BasicPaginated } from '../../../core/pagination/basic.paginated.type';
import { Token } from '../token.model';

@ObjectType()
export class TokenConnection extends BasicPaginated(Token) {}
