import { ObjectType } from '@nestjs/graphql';

import { Paginated } from '../../../core/pagination/pagination';
import { MessageSession } from '../messageSession.model';

@ObjectType()
export class MessageSessionConnection extends Paginated(MessageSession) {}
