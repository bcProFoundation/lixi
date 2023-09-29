import { Comment as AntdComment } from '@ant-design/compatible';
import { DislikeFilled, DislikeOutlined, LikeFilled, LikeOutlined } from '@ant-design/icons';
import { BurnForType } from '@bcpros/lixi-models/lib/burn';
import { AvatarUser } from '@components/Common/AvatarUser';
import { Counter } from '@components/Common/Counter';
import { WalletContext } from '@context/walletProvider';
import { Comment, Post } from '@generated/types.generated';
import useXPI from '@hooks/useXPI';
import { getSelectedAccount } from '@store/account/selectors';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { getAllWalletPaths, getSlpBalancesAndUtxos } from '@store/wallet';
import { formatBalance } from '@utils/cashMethods';
import { Space, Tooltip } from 'antd';
import _ from 'lodash';
import moment from 'moment';
import { useRouter } from 'next/router';
import React, { useRef } from 'react';
import intl from 'react-intl-universal';
import { prepareBurnCommand } from '@store/burn';


type CommentListItemProps = {
  index: number;
  item: Comment;
  post: Post;
};

const CommentListItem = ({ index, item, post }: CommentListItemProps) => {
  const dispatch = useAppDispatch();
  const history = useRouter();
  const Wallet = React.useContext(WalletContext);
  const { XPI, chronik } = Wallet;

  const upVoteComment = (dataItem: Comment) => {
    dispatch(prepareBurnCommand({
      isUpVote: true,
      burnForItem: dataItem,
      burnForType: BurnForType.Comment,
      burnValue: '1'
    }));
  };

  const downVoteComment = (dataItem: Comment) => {
    dispatch(prepareBurnCommand({
      isUpVote: false,
      burnForItem: dataItem,
      burnForType: BurnForType.Comment,
      burnValue: '1'
    }));
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
