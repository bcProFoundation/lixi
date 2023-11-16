export interface IEdge<T> {
  cursor: string;
  node: T;
}

export interface IBasicPageInfo {
  endCursor: string;
  hasNextPage: boolean;
}

export interface IRelayPageInfo extends IBasicPageInfo {
  startCursor: string;
  hasPreviousPage: boolean;
}

export interface IBasicPaginated<T> {
  totalCount: number;
  edges: IEdge<T>[];
  pageInfo: IBasicPageInfo;
}

export interface IRelayPaginated<T> {
  previousCount: number;
  currentCount: number;
  edges: IEdge<T>[];
  pageInfo: IRelayPageInfo;
}
