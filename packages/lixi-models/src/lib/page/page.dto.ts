import { Nullable } from '../nullable';

export class PageDto {
  id: string;
  pageAccountId: number;
  name: string;
  title: string;
  categoryId?: Nullable<number>;
  walletAddress: string;
  description: string;
  avatar: string;
  cover: string;
  parentId?: Nullable<string>;
  address?: Nullable<string>;
  website: string;
  countryId?: Nullable<number>;
  stateId?: Nullable<number>;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<PageDto>) {
    Object.assign(this, partial);
  }
}
