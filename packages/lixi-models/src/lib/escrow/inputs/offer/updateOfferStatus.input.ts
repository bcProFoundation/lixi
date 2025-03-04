import { Field, InputType } from '@nestjs/graphql';
import { Nullable } from '../../../nullable';
import { OfferStatus } from '../../offer.model';

@InputType()
export class UpdateOfferStatusInput {
  @Field(() => String)
  id: string;

  @Field(() => OfferStatus, { nullable: true })
  status?: Nullable<OfferStatus>;
}
