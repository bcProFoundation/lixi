import { Field, InputType, registerEnumType } from '@nestjs/graphql';

import { Order } from '../../../core';

export enum BookmarkOrderField {
  id = 'id',
  createdAt = 'createdAt',
  updatedAt = 'updatedAt'
}

registerEnumType(BookmarkOrderField, {
  name: 'BookmarkOrderField',
  description: 'Properties by which message connections can be ordered.'
});

@InputType()
export class BookmarkOrder extends Order {
  @Field(() => BookmarkOrderField)
  field: BookmarkOrderField;
}
