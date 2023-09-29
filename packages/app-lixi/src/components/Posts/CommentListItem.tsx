import { Comment as AntdComment } from '@ant-design/compatible';
import { DislikeFilled, DislikeOutlined, LikeFilled, LikeOutlined } from '@ant-design/icons';
import { BurnForType } from '@bcpros/lixi-models/lib/burn';
import useAuthorization from '@components/Common/Authorization/use-authorization.hooks';
import AvatarUser from '@components/Common/AvatarUser';
import { Counter } from '@components/Common/Counter';
import { AuthorizationContext } from '@context/index';
import { Comment, Post } from '@generated/types.generated';
import { prepareBurnCommand } from '@store/burn';
import { useAppDispatch } from '@store/hooks';
import { formatBalance } from '@utils/cashMethods';
import { Space, Tooltip } from 'antd';
import _ from 'lodash';
import moment from 'moment';
import { useRouter } from 'next/router';
import React, { useContext, useMemo } from 'react';
import intl from 'react-intl-universal';

const ACTION_VOTE = {
  UP_VOTE: 'upVote',
  DOWN_VOTE: 'downVote'
};
const DEFAULT_USERNAME = 'Anonymous';

type CommentListItemProps = {
  item: Comment;
  post?: Post;
};

const CommentListItem = ({ item, post }: CommentListItemProps) => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const authorization = useContext(AuthorizationContext);
  const askAuthorization = useAuthorization();

  const userName = useMemo(() => {
    return _.isNil(item?.commentAccount) ? DEFAULT_USERNAME : item?.commentAccount?.name;
  }, [item?.commentAccount]);

  const actionsComment = (dataItem: Comment, action: string) => {
    if (authorization.authorized) {
      const isUpVote = action == ACTION_VOTE.UP_VOTE ? true : false;
      const burnForType = BurnForType.Comment;
      dispatch(prepareBurnCommand({
        isUpVote,
        burnForItem: dataItem,
        burnForType,
        burnValue: '1'
      }));
    } else {
      askAuthorization();
    }
  };
  const actions = [
    <span key={`comment-up-vote-${item.id}`}>
      <Tooltip title={intl.get('general.burnUp')}>
        <Space onClick={() => actionsComment(item, ACTION_VOTE.UP_VOTE)}>
          {item?.danaBurnUp > 0 ? <LikeFilled /> : <LikeOutlined />}
          <Counter num={formatBalance(item?.danaBurnUp ?? 0)} />
        </Space>
      </Tooltip>
    </span>,
    <span key={`comment-down-vote-${item.id}`}>
      <Tooltip title={intl.get('general.burnDown')}>
        <Space onClick={() => actionsComment(item, ACTION_VOTE.DOWN_VOTE)}>
          {item?.danaBurnDown > 0 ? <DislikeFilled /> : <DislikeOutlined />}
          <Counter num={formatBalance(item?.danaBurnDown ?? 0)} />
        </Space>
      </Tooltip>
    </span>
  ];

  return (
    <AntdComment
      className="comment-item"
      actions={actions}
      author={<a href={`/profile/${item.commentAccount.address}`}>{userName}</a>}
      avatar={
        <div onClick={() => router.push(`/profile/${item.commentAccount.address}`)}>
          <AvatarUser icon={item?.commentAccount?.avatar} name={item?.commentAccount?.name} isMarginRight={false} />
        </div>
      }
      content={item.commentText}
      datetime={
        <Tooltip title={moment(item.createdAt).format('YYYY-MM-DD HH:mm:ss')}>
          <span>{moment(item.createdAt).fromNow()}</span>
        </Tooltip>
      }
    />
  );
};

export default React.memo(CommentListItem);
