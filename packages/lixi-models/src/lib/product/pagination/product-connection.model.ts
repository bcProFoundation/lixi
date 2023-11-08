import { ObjectType } from '@nestjs/graphql';

import { Paginated } from '../../../core';
import { Product } from '../product.model';

@ObjectType()
export class ProductConnection extends Paginated(Product) {}
