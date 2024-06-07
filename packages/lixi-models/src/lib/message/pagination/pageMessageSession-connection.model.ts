import { ObjectType } from '@nestjs/graphql';

import { Paginated } from '../../../core/pagination/pagination';
import { PageMessageSession } from '../pageMessageSession.model';

@ObjectType()
export class PageMessageSessionConnection extends Paginated(PageMessageSession) {}
