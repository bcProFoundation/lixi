import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';

import { DisputeStatus } from '../dispute.model';

@InputType()
export class UpdateDisputeInput {
  @Field(() => String)
  @IsNotEmpty()
  id: string;

  @Field(() => String)
  @IsNotEmpty()
  escrowOrderId: string;

  @Field(() => DisputeStatus)
  @IsNotEmpty()
  status: DisputeStatus;
}
