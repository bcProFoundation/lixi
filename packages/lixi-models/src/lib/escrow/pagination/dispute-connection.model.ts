import { ObjectType } from '@nestjs/graphql';

import { Paginated } from '../../../core';
import { Dispute } from '../dispute.model';

@ObjectType()
export class DisputeConnection extends Paginated(Dispute) {}
