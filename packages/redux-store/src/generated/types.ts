import { Account, Comment, Hashtag, Page, Post, Token, Worship } from "./types.generated";

export type BurnForItem =
  Post |
  Page |
  Comment |
  Token |
  Hashtag |
  Account |
  Worship;
