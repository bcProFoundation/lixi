import { BurnForType } from '@bcpros/lixi-models';
import { PageQueryItem } from '@generated/index';
import { Space } from 'antd';
import React from 'react';
import styled from 'styled-components';
import { WithAuthorizeAction } from './Authorization/WithAuthorizeAction';
import Counter from './Counter';
import BaseReaction from './Reaction';

export const GroupIconText = styled.div`
  align-items: center;
  display: flex;
  .ant-space {
    cursor: pointer;
    margin-right: 1rem;
    align-items: end;
    border-radius: 12px;
    cursor: pointer;
    @media (max-width: 960px) {
      margin-right: 0;
    }

    &.repost,
    &.dana-view-score {
      svg {
        color: var(--color-primary);
        width: 28px;
        height: 28px;
      }
    }
  }
  img {
    width: 28px;
    height: 28px;
  }
  .count {
    color: rgba(30, 26, 29, 0.6);
    font-size: 12px;
  }
`;

export const SpaceIconNoneHover = styled(Space)`
  min-height: 38px;
  padding: 8px;
  img {
    transition: all 0.2s ease-in-out;
    width: 28px;
    height: 28px;
  }

  &:hover {
    background: #faf1fa;
  }
`;

export const IconNoneHover = ({
  value,
  imgUrl,
  classStyle,
  onClick
}: {
  value?: number;
  imgUrl?: string;
  classStyle?: string;
  onClick: (...args: any) => void;
}) => (
  <SpaceIconNoneHover onClick={onClick} size={5}>
    {imgUrl && (
      <picture>
        <img className={classStyle} alt="burnIcon" src={imgUrl} />
      </picture>
    )}
    {value && <Counter num={value ?? 0} />}
  </SpaceIconNoneHover>
);

const ActionBar = styled.div`
  display: flex;
  justify-content: space-between;
  border-top: 1px solid var(--border-color-base);
  padding: 0.5rem;
  &.border-bottom {
    border-bottom: 1px solid var(--border-color-base);
  }
  .ant-space {
    gap: 4px !important;
  }
  .reaction-func {
    color: rgba(30, 26, 29, 0.6);
    cursor: pointer;
    display: flex;
    gap: 1rem;
    img {
      width: 28px;
      height: 28px;
      margin-right: 4px;
    }
  }
  @media (max-width: 520px) {
    padding: 4px;
  }
`;

type ActionPageBarProps = {
  page: PageQueryItem;
};

const AuthorizeReaction = WithAuthorizeAction(BaseReaction);

const ActionPageBar = ({ page }: ActionPageBarProps) => {
  return (
    <ActionBar className={`action-post-bar 'border-bottom'`}>
      <GroupIconText>
        <AuthorizeReaction dataItem={page} burnForType={BurnForType.Page} />
      </GroupIconText>
    </ActionBar>
  );
};

export default React.memo(ActionPageBar);
