import { ObjectType } from '@nestjs/graphql';

import { Paginated } from '../../../core';
import { Offer } from '../offer.model';

@ObjectType()
export class OfferConnection extends Paginated(Offer) {}
