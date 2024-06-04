import { ObjectType } from '@nestjs/graphql';

import { Paginated } from '../../../core/pagination/pagination';
import { EscrowOrder } from '../escrow-order.model';

@ObjectType()
export class EscrowOrderConnection extends Paginated(EscrowOrder) {}
