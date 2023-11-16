import { ObjectType } from '@nestjs/graphql';

import { BasicPaginated } from '../../../core';
import { Token } from '../token.model';

@ObjectType()
export class TokenConnection extends BasicPaginated(Token) {}
