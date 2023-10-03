import { ObjectType } from '@nestjs/graphql';

import { Paginated } from '../../../core';
import { Bookmark } from '../bookmark.model';

@ObjectType()
export class BookmarkConnection extends Paginated(Bookmark) {}
