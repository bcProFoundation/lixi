export interface IPageInfo {
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  startCursor: number | string;
  endCursor: number | string;
}

export interface IPaginationResult<T> {
  data: T[];
  pageInfo: IPageInfo;
  totalCount: number;
}
