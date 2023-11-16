import { OPTION_BURN_TYPE, OPTION_BURN_VALUE } from '@bcpros/lixi-models/constants';
import { BurnForType } from '@bcpros/lixi-models/lib/burn';
import { AuthenticationContext, AuthorizationContext } from '@context/index';
import { AccountQueryItem, CommentQueryItem, PageQueryItem, PostQueryItem, TokenQueryItem } from '@generated/index';
import { BurnForItem } from '@generated/types';
import useDetectMobileView from '@local-hooks/useDetectMobileView';
import { prepareBurnCommand } from '@store/burn';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { openModal } from '@store/modal/actions';
import { getCurrentThemes } from '@store/settings';
import { Popover, Space } from 'antd';
import React, { useContext, useState } from 'react';
import { formatBalance } from 'src/utils/cashMethods';
import styled from 'styled-components';
import { match } from 'ts-pattern';
import useAuthorization from './Authorization/use-authorization.hooks';
import Counter from './Counter';

const SpaceIconBurnHover = styled(Space)`
  min-height: 38px;
  padding: 8px;
  border-radius: 12px;
  img {
    transition: all 0.2s ease-in-out;
    width: 28px;
    height: 28px;
  }

  .ant-space-item > span {
    display: flex;
    align-items: end;
  }

  &:hover {
    background: #ecf0ff;
  }
`;

const StyledBurnIconHover = styled.img`
  transition: all 0.2s ease-in-out;
  width: 24px;
  height: 24px;
  align-self: center;
  cursor: pointer;

  &:active {
    animation: jump 0.6s ease-in-out;
  }

  @keyframes jump {
    0% {
      transform: translateY(0);
    }
    30% {
      transform: translateY(-10px);
    }
    70% {
      transform: translateY(-5px);
    }
    100% {
      transform: translateY(0);
    }
  }
`;

const Hint = styled.span`
  display: flex;
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.5px;
  padding: 1px 3px;
`;

const HintMobile = styled.span`
  display: flex;
  justify-content: center;
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.5px;
`;

const SpaceContentBurn = styled(Space)`
  display: flex;
  .ant-space-item {
    width: 42px;
    height: 42px;
    display: flex;
    justify-content: center;
    align-items: end;
    background: none;
    border-radius: var(--border-radius-primary);
  }

  .container-ico-hover {
    width: 36px;
    height: 36px;
    display: flex;
    justify-content: center;
    align-items: end;
    background: #fff;
    border-radius: 24px;
    transition: all 0.15s ease-in-out;
    img {
      transition: all 0.15s ease-in-out;
      width: 24px;
      height: 24px;
      align-self: center;
      cursor: pointer;
    }
  }

  .ant-popover-open {
    width: 100%;
    height: 100%;
    img {
      width: 32px;
      height: 32px;
    }
  }
`;

type ReactionProps = {
  burnForType: BurnForType;
  dataItem: BurnForItem;
};

const Reaction = ({ burnForType, dataItem }: ReactionProps) => {
  const dispatch = useAppDispatch();
  const isMobile = useDetectMobileView();
  const [clicked, setClicked] = useState(false);
  const [hovered, setHovered] = useState(false);
  const currentTheme = useAppSelector(getCurrentThemes);
  const authentication = useContext(AuthenticationContext);

  const burnValue: number = match(burnForType)
    .with(BurnForType.Post, () => (dataItem as PostQueryItem).postDana.danaReceivedScore)
    .with(BurnForType.Page, () => (dataItem as PageQueryItem).pageDana.danaReceivedScore)
    .with(BurnForType.Account, () => (dataItem as AccountQueryItem).accountDana.danaGiven)
    .with(BurnForType.Comment, () => (dataItem as CommentQueryItem).danaBurnScore)
    .with(BurnForType.Token, () => (dataItem as TokenQueryItem).danaBurnScore)
    .otherwise(() => 0);

  const authorization = useContext(AuthorizationContext);
  const askAuthorization = useAuthorization();

  const contentHoverLike = <Hint>+{OPTION_BURN_VALUE.LOVE} </Hint>;

  const contentHoverDisLike = <Hint>+{OPTION_BURN_VALUE.LIKE}</Hint>;

  const contentHoverHeart = <Hint>-{OPTION_BURN_VALUE.DISLIKE}</Hint>;

  const contentHoverCustom = <Hint>Custom</Hint>;

  const handleBurnOption = async (
    e: React.MouseEvent<HTMLElement>,
    dataItem: BurnForItem,
    optionBurn: string,
    isUpVote: boolean
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (authorization.authorized) {
      if (authentication && authentication.isAuthenticationRequired && !authentication.isSignedIn) {
        await authentication.signIn();
      }
      const burnValue = optionBurn ? OPTION_BURN_VALUE[optionBurn] : '1';
      dispatch(
        prepareBurnCommand({
          isUpVote,
          burnForItem: dataItem,
          burnForType,
          burnValue
        })
      );
    } else {
      askAuthorization();
    }

    hideReact();
  };

  const hideReact = () => {
    setClicked(false);
    setHovered(false);
  };

  const handleHoverChange = (open: boolean) => {
    setHovered(open);
    setClicked(false);
  };

  const handleClickChange = (open: boolean) => {
    setHovered(false);
    setTimeout(() => {
      setClicked(open);
    }, 100);
  };

  const openBurnModal = (e: React.MouseEvent<HTMLElement>, dataItem: BurnForItem) => {
    if (authorization.authorized) {
      dispatch(
        openModal('BurnModal', {
          burnForType: BurnForType.Post,
          burnForItem: dataItem,
          classStyle: 'burn-modal'
        })
      );
    } else {
      askAuthorization();
    }

    hideReact();
  };

  const contentBurn = (
    <SpaceContentBurn>
      <Popover
        arrow={false}
        overlayClassName="popover-custom-hint"
        placement="top"
        content={contentHoverLike}
        trigger="hover"
      >
        <div className="container-ico-hover">
          <StyledBurnIconHover
            src={'/images/heart.svg'}
            onMouseOver={e => {
              e.currentTarget.src = '/images/heart-w-burn.svg';
            }}
            onMouseOut={e => (e.currentTarget.src = '/images/heart.svg')}
            onClick={e => handleBurnOption(e, dataItem, OPTION_BURN_TYPE.LOVE, true)}
          />
        </div>
      </Popover>
      <Popover
        arrow={false}
        overlayClassName="popover-custom-hint"
        placement="top"
        content={contentHoverDisLike}
        trigger="hover"
      >
        <div className="container-ico-hover">
          <StyledBurnIconHover
            src={'/images/like.svg'}
            onMouseOver={e => {
              e.currentTarget.src = '/images/like-w-burn.svg';
            }}
            onMouseOut={e => (e.currentTarget.src = '/images/like.svg')}
            onClick={e => handleBurnOption(e, dataItem, OPTION_BURN_TYPE.LIKE, true)}
          />
        </div>
      </Popover>
      <Popover
        arrow={false}
        overlayClassName="popover-custom-hint"
        placement="top"
        content={contentHoverHeart}
        trigger="hover"
      >
        <div className="container-ico-hover">
          <StyledBurnIconHover
            src={'/images/dislike.svg'}
            onMouseOver={e => {
              e.currentTarget.src = '/images/dislike-w-burn.svg';
            }}
            onMouseOut={e => (e.currentTarget.src = '/images/dislike.svg')}
            onClick={e => handleBurnOption(e, dataItem, OPTION_BURN_TYPE.DISLIKE, false)}
          />
        </div>
      </Popover>
      <Popover
        arrow={false}
        overlayClassName="popover-custom-hint"
        placement="top"
        content={contentHoverCustom}
        trigger="hover"
      >
        <div className="container-ico-hover">
          <StyledBurnIconHover
            src={'/images/more-horiz.svg'}
            onMouseOver={e => {
              e.currentTarget.src = '/images/more-horiz-w-burn.svg';
            }}
            onMouseOut={e => (e.currentTarget.src = '/images/more-horiz.svg')}
            onClick={e => openBurnModal(e, dataItem)}
          />
        </div>
      </Popover>
    </SpaceContentBurn>
  );

  const contentBurnMobile = (
    <SpaceContentBurn>
      <Popover arrow={false} overlayClassName="popover-custom-hint">
        <div className="container-ico-hover">
          <StyledBurnIconHover
            src={'/images/heart.svg'}
            onMouseOver={e => {
              e.currentTarget.src = '/images/heart-w-burn.svg';
            }}
            onMouseOut={e => (e.currentTarget.src = '/images/heart.svg')}
            onClick={e => handleBurnOption(e, dataItem, OPTION_BURN_TYPE.LOVE, true)}
          />
        </div>
        <HintMobile>+{OPTION_BURN_VALUE.LOVE} </HintMobile>
      </Popover>
      <Popover arrow={false} overlayClassName="popover-custom-hint">
        <div className="container-ico-hover">
          <StyledBurnIconHover
            src={'/images/like.svg'}
            onMouseOver={e => {
              e.currentTarget.src = '/images/like-w-burn.svg';
            }}
            onMouseOut={e => (e.currentTarget.src = '/images/like.svg')}
            onClick={e => handleBurnOption(e, dataItem, OPTION_BURN_TYPE.LIKE, true)}
          />
        </div>
        <HintMobile>+{OPTION_BURN_VALUE.LIKE}</HintMobile>
      </Popover>
      <Popover arrow={false} overlayClassName="popover-custom-hint">
        <div className="container-ico-hover">
          <StyledBurnIconHover
            src={'/images/dislike.svg'}
            onMouseOver={e => {
              e.currentTarget.src = '/images/dislike-w-burn.svg';
            }}
            onMouseOut={e => (e.currentTarget.src = '/images/dislike.svg')}
            onClick={e => handleBurnOption(e, dataItem, OPTION_BURN_TYPE.DISLIKE, false)}
          />
        </div>
        <HintMobile>+{OPTION_BURN_VALUE.DISLIKE}</HintMobile>
      </Popover>
      <Popover arrow={false} overlayClassName="popover-custom-hint">
        <div className="container-ico-hover">
          <StyledBurnIconHover
            src={'/images/more-horiz.svg'}
            onMouseOver={e => {
              e.currentTarget.src = '/images/more-horiz-w-burn.svg';
            }}
            onMouseOut={e => (e.currentTarget.src = '/images/more-horiz.svg')}
            onClick={e => openBurnModal(e, dataItem)}
          />
        </div>
        {isMobile && <HintMobile>Custom</HintMobile>}
      </Popover>
    </SpaceContentBurn>
  );

  const IconBurnHover = ({ burnValue, classStyle }: { burnValue?: number; classStyle?: string }) => (
    <SpaceIconBurnHover wrap size={5}>
      <Popover
        overlayClassName={`${currentTheme === 'dark' ? 'popover-dark' : ''}`}
        arrow={false}
        overlayInnerStyle={{
          display: 'flex',
          gap: '4px',
          padding: isMobile ? '16px 8px 8px 8px' : '0 8px 8px 8px',
          background: '#d7e3ff',
          boxShadow: '0px 0px 12px rgba(0, 0, 0, 0.12)',
          borderRadius: '16px',
          marginLeft: isMobile ? '1rem' : '0'
        }}
        content={isMobile ? contentBurnMobile : contentBurn}
        trigger={isMobile ? 'click' : 'hover'}
        open={isMobile ? clicked : hovered}
        onOpenChange={isMobile ? handleClickChange : handleHoverChange}
      >
        <picture>
          <img className={classStyle} alt="burnIcon" src={'/images/ico-burn-up.svg'} />
        </picture>

        {burnValue && <Counter isShowXPI={true} num={burnValue ?? 0} />}
      </Popover>
    </SpaceIconBurnHover>
  );

  return (
    <>
      <IconBurnHover burnValue={formatBalance(burnValue ?? 0)} />
    </>
  );
};

export default Reaction;
