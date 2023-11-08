import { Field, ID, InputType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';

@InputType()
export class DeleteProductInput {
  @Field(() => ID)
  id: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  uploadImages: string[];
}
