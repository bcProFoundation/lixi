import { ObjectType } from '@nestjs/graphql';

import { Paginated } from '../../../core/pagination/pagination';
import { Comment } from '../comment.model';

@ObjectType()
export class CommentConnection extends Paginated(Comment) {}
