import { Comment as AntdComment } from '@ant-design/compatible';
import { DislikeFilled, DislikeOutlined, LikeFilled, LikeOutlined } from '@ant-design/icons';
import { BurnForType } from '@bcpros/lixi-models/lib/burn/burn.model';
import { AvatarUser } from '@components/Common/AvatarUser';
import Counter from '@components/Common/Counter';
import { CommentQueryItem, PostQueryItem } from '@generated/index';
import { prepareBurnCommand } from '@store/burn';
import { useSliceDispatch } from '@store/index';
import { formatBalance } from '@utils/cashMethods';
import { Space, Tooltip } from 'antd';
import _ from 'lodash';
import moment from 'moment';
import { useRouter } from 'next/router';
import React from 'react';
import intl from 'react-intl-universal';

type CommentListItemProps = {
  item: CommentQueryItem;
  post: PostQueryItem;
};

const CommentListItem = ({ item, post }: CommentListItemProps) => {
  const dispatch = useSliceDispatch();
  const history = useRouter();

  const upVoteComment = (dataItem: CommentQueryItem) => {
    // dispatch(
    //   prepareBurnCommand({
    //     isUpVote: true,
    //     burnForItem: dataItem,
    //     burnForType: BurnForType.Comment,
    //     burnValue: '1'
    //   })
    // );
  };

  const downVoteComment = (dataItem: CommentQueryItem) => {
    // dispatch(
    //   prepareBurnCommand({
    //     isUpVote: false,
    //     burnForItem: dataItem,
    //     burnForType: BurnForType.Comment,
    //     burnValue: '1'
    //   })
    // );
  };

  const showUsername = () => {
    if (_.isNil(item?.commentAccount)) {
      return 'Anonymous';
    }

    return item?.commentAccount?.name;
  };

  const actions = [
    <span key={`comment-up-vote-${item.id}`}>
      <Tooltip title={intl.get('general.burnUp')}>
        <Space onClick={() => upVoteComment(item)}>
          {item?.danaBurnUp > 0 ? <LikeFilled /> : <LikeOutlined />}
          <Counter num={formatBalance(item?.danaBurnUp ?? 0)} />
        </Space>
      </Tooltip>
    </span>,
    <span key={`comment-down-vote-${item.id}`}>
      <Tooltip title={intl.get('general.burnDown')}>
        <Space onClick={() => downVoteComment(item)}>
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
      author={<a href={`/profile/${item.commentAccount.address}`}>{showUsername()}</a>}
      avatar={
        <div onClick={() => history.push(`/profile/${item.commentAccount.address}`)}>
          <AvatarUser name={item?.commentAccount?.name} isMarginRight={false} />
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
