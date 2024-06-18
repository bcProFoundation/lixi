import { ObjectType } from '@nestjs/graphql';

import { Paginated } from '../../../core/pagination/pagination';
import { Offer } from '../offer.model';

@ObjectType()
export class OfferConnection extends Paginated(Offer) {}
