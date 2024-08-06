import { ObjectType } from '@nestjs/graphql';

import { BasicPaginated } from '../../../core/pagination/basic.paginated.type';
import { Offer } from '../offer.model';

@ObjectType()
export class OfferBasicConnection extends BasicPaginated(Offer) {}
