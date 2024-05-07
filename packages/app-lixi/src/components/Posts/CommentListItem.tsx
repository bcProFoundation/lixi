import { Comment as AntdComment } from '@ant-design/compatible';
import { DislikeFilled, DislikeOutlined, DownOutlined, LikeFilled, LikeOutlined, UpOutlined } from '@ant-design/icons';
import { BurnForType } from '@bcpros/lixi-models/lib/burn';
import useAuthorization from '@components/Common/Authorization/use-authorization.hooks';
import AvatarUser from '@components/Common/AvatarUser';
import Counter from '@components/Common/Counter';
import { AuthorizationContext } from '@context/index';
import { Comment, Post } from '@generated/types.generated';
import { prepareBurnCommand } from '@store/burn';
import { useAppDispatch } from '@store/hooks';
import { formatBalance } from '@utils/cashMethods';
import { Space, Tooltip } from 'antd';
import _ from 'lodash';
import moment from 'moment';
import { useRouter } from 'next/router';
import React, { useContext, useEffect, useMemo, useState } from 'react';
import intl from 'react-intl-universal';
import { PostQueryItem, CommentQueryItem } from '@generated/index';
import styled from 'styled-components';
import IconBurnComment from './IconBurnComment';
import { Parser as HtmlToReactParser } from 'html-to-react';

const SpaceCustom = styled(Space)`
  gap: 5px !important;
`;
const ImageComment = styled.div`
  img {
    width: auto;
    height: auto;
    max-width: 100% !important;
    max-height: 30vh !important;
    border-radius: var(--border-radius-item);
  }
`;

const ACTION_VOTE = {
  UP_VOTE: 'upVote',
  DOWN_VOTE: 'downVote'
};
const DEFAULT_USERNAME = 'Anonymous';

type CommentListItemProps = {
  item: CommentQueryItem;
  post?: PostQueryItem;
  refsComment?: Object;
  setReplyCommentCustom?: (display: boolean, item: CommentQueryItem) => void;
  setFocusComment?: () => void;
};

const CommentListItem = ({ item, post, refsComment, setReplyCommentCustom, setFocusComment }: CommentListItemProps) => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const authorization = useContext(AuthorizationContext);
  const askAuthorization = useAuthorization();
  const image = item?.imageUploadable?.uploads[0];
  const [isHoverIconBurn, setIsHoverIconBurn] = useState<boolean>(false);

  const userName = useMemo(() => {
    return _.isNil(item?.commentAccount) ? DEFAULT_USERNAME : item?.commentAccount?.name;
  }, [item?.commentAccount]);

  const actionsComment = (dataItem: CommentQueryItem, action: string) => {
    if (authorization.authorized) {
      const isUpVote = action == ACTION_VOTE.UP_VOTE ? true : false;
      const burnForType = BurnForType.Comment;
      dispatch(
        prepareBurnCommand({
          isUpVote,
          burnForItem: dataItem,
          burnForType,
          burnValue: '1'
        })
      );
    } else {
      askAuthorization();
    }
  };

  const handleClickReply = item => {
    setReplyCommentCustom(true, item);
    setFocusComment();
  };

  const actions = [
    <span key={`comment-down-vote-${item.id}`}>
      <Tooltip title={() => intl.get('general.burnDown')}>
        <SpaceCustom onClick={() => actionsComment(item, ACTION_VOTE.DOWN_VOTE)}>
          <IconBurnComment isUp={false} />
          <Counter num={formatBalance(item?.danaBurnDown ?? 0)} />
        </SpaceCustom>
      </Tooltip>
    </span>,
    <span style={{ marginInlineEnd: '15px' }} key={`comment-up-vote-${item.id}`}>
      <Tooltip title={() => intl.get('general.burnUp')}>
        <SpaceCustom onClick={() => actionsComment(item, ACTION_VOTE.UP_VOTE)}>
          <IconBurnComment isUp />
          <Counter num={formatBalance(item?.danaBurnUp ?? 0)} />
        </SpaceCustom>
      </Tooltip>
    </span>,
    <span key={`reply-${item.id}`}>
      <SpaceCustom className="anticon" onClick={() => handleClickReply(item)}>
        {intl.get('comment.reply')}
      </SpaceCustom>
    </span>
  ];

  const handleJump = parentId => {
    const elementJumped = refsComment[parentId];
    if (elementJumped) {
      elementJumped.firstChild.classList.add('active-comment');
      elementJumped.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        elementJumped.firstChild.classList.remove('active-comment');
      }, 3000);
    }
  };

  const elementParsedComment = () => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parsedContent = item.commentText.replace(urlRegex, url => `<a href=${url}>${url}</a>`);

    const htmlToReactParser = HtmlToReactParser();
    return htmlToReactParser.parse(parsedContent);
  };

  return (
    <>
      <AntdComment
        className="comment-item"
        actions={actions}
        author={<a href={`/profile/${item.commentAccount.address}`}>{userName}</a>}
        avatar={
          <div onClick={() => router.push(`/profile/${item.commentAccount.address}`)}>
            <AvatarUser icon={item?.commentAccount?.avatar} name={item?.commentAccount?.name} isMarginRight={false} />
          </div>
        }
        content={
          <React.Fragment>
            {item.parent && (
              <div className="reply-comment-jump" onClick={() => handleJump(item.parentId)}>
                <p className="reply-comment-jump-name"> {item.parent.commentAccount.name}</p>
                <p className="reply-comment-jump-content hide-content">{item.parent.commentText}</p>
              </div>
            )}

            {elementParsedComment()}
            <ImageComment>
              {image && (
                <picture>
                  <img
                    alt={item.imageUploadable.uploads[0].id}
                    src={`${process.env.NEXT_PUBLIC_CF_IMAGES_DELIVERY_URL}/${process.env.NEXT_PUBLIC_CF_ACCOUNT_HASH}/${image.cfImageId}/public`}
                  />
                </picture>
              )}
            </ImageComment>
          </React.Fragment>
        }
        datetime={
          <Tooltip title={moment(item.createdAt).format('YYYY-MM-DD HH:mm:ss')}>
            <span>{moment(item.createdAt).fromNow()}</span>
          </Tooltip>
        }
      />
    </>
  );
};

export default React.memo(CommentListItem);
