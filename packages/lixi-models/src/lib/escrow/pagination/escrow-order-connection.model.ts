import { ObjectType } from '@nestjs/graphql';

import { Paginated } from '../../../core';
import { EscrowOrder } from '../escrow-order.model';

@ObjectType()
export class EscrowOrderConnection extends Paginated(EscrowOrder) {}
