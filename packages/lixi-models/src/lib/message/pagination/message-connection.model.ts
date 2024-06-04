import { ObjectType } from '@nestjs/graphql';

import { Paginated } from '../../../core/pagination/pagination';
import { Message } from '../message.model';

@ObjectType()
export class MessageConnection extends Paginated(Message) {}
