import { OPTION_BURN_TYPE, OPTION_BURN_VALUE } from '@bcpros/lixi-models/constants/burn';
import { BurnForType } from '@bcpros/lixi-models/lib/burn/burn.model';
import { AuthenticationContext, AuthorizationContext } from '@context/index';
import {
  AccountQueryItem,
  CommentQueryItem,
  PageQueryItem,
  PostQueryItem,
  TokenQueryItem,
  BurnForItem
} from '@generated/types';
import useDetectMobileView from '@local-hooks/useDetectMobileView';
import { prepareBurnCommand } from '@store/burn';
import { useSliceDispatch, useSliceSelector } from '@store/index';
import { openModal } from '@store/modal/actions';
import { getCurrentThemes } from '@store/settings';
import { Popover, Space } from 'antd';
import React, { useContext, useEffect, useState } from 'react';
import { formatBalance } from 'src/utils/cashMethods';
import styled from 'styled-components';
import { match } from 'ts-pattern';
import useAuthorization from './Authorization/use-authorization.hooks';
import Counter from './Counter';
import IconBurnCustomProps from './IconBurn/IconBurnCustom';
import { COIN } from '@bcpros/lixi-models/constants/coins/coin';
import { Coin } from '@generated/types.generated';
import { useConvertDanaToCoinQuery } from '@store/dana/dana.api';
import { coinInfo } from '@bcpros/lixi-models/constants/coins/coin-info';
import { calBurnAmountWithFee, calBurnAmountWithoutFee } from 'src/utils/burnValueWithFee';

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

export const StyledBurnIconHover = styled.img`
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
  align-items: center;
  flex-direction: column;
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
  const dispatch = useSliceDispatch();
  const isMobile = useDetectMobileView();
  const [clicked, setClicked] = useState(false);
  const [hovered, setHovered] = useState(false);
  const currentTheme = useSliceSelector(getCurrentThemes);
  const authentication = useContext(AuthenticationContext);

  const [burnAmountPerCoin, setBurnAmountPerCoin] = useState(0);
  const { data: dataBurn } = useConvertDanaToCoinQuery({
    ConvertDanaInput: {
      convertToCoin: COIN.XPI as unknown as Coin
    }
  });

  useEffect(() => {
    setBurnAmountPerCoin(dataBurn?.convertDanaToCoin ?? 0);
  }, [dataBurn]);

  const burnValue: number = match(burnForType)
    .with(BurnForType.Post, () => (dataItem as PostQueryItem)?.dana?.danaReceivedScore)
    .with(BurnForType.Page, () => (dataItem as PageQueryItem)?.dana?.danaReceivedScore)
    .with(BurnForType.Account, () => (dataItem as AccountQueryItem).accountDana?.danaGiven)
    .with(BurnForType.Comment, () => (dataItem as CommentQueryItem).danaBurnScore)
    .with(BurnForType.Token, () => (dataItem as TokenQueryItem)?.dana?.danaBurnScore)
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
          burnValue: (Number(burnValue) * burnAmountPerCoin).toString(),
          amountDana: Number(burnValue)
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
        content={contentHoverHeart}
        trigger="hover"
      >
        <IconBurnCustomProps
          icon="down-arrow.svg"
          colorBackground="var(--color-danger)"
          colorFilterIcon="var(--filter-svg-red-color)"
          burnForType={burnForType}
          dataItem={dataItem}
          burnValueWithFee={calBurnAmountWithFee(Number(OPTION_BURN_VALUE.DISLIKE), burnAmountPerCoin, true)}
          burnValueWithoutFee={calBurnAmountWithoutFee(Number(OPTION_BURN_VALUE.DISLIKE), burnAmountPerCoin, true)}
          amountDana={Number(OPTION_BURN_VALUE.DISLIKE)}
          isUpBurn={false}
          hideReact={hideReact}
        />
      </Popover>
      <Popover
        arrow={false}
        overlayClassName="popover-custom-hint"
        placement="top"
        content={contentHoverDisLike}
        trigger="hover"
      >
        <IconBurnCustomProps
          icon="up-arrow.svg"
          colorBackground="#00abe7"
          colorFilterIcon="var(--filter-svg-blue-color)"
          burnForType={burnForType}
          dataItem={dataItem}
          burnValueWithFee={calBurnAmountWithFee(Number(OPTION_BURN_VALUE.LIKE), burnAmountPerCoin, true)}
          burnValueWithoutFee={calBurnAmountWithoutFee(Number(OPTION_BURN_VALUE.LIKE), burnAmountPerCoin, true)}
          amountDana={Number(OPTION_BURN_VALUE.LIKE)}
          isUpBurn={true}
          hideReact={hideReact}
        />
      </Popover>
      <Popover
        arrow={false}
        overlayClassName="popover-custom-hint"
        placement="top"
        content={contentHoverLike}
        trigger="hover"
      >
        <IconBurnCustomProps
          icon="double-up-arrow.svg"
          colorBackground="#00abe7"
          colorFilterIcon="var(--filter-svg-blue-color)"
          burnForType={burnForType}
          dataItem={dataItem}
          burnValueWithFee={calBurnAmountWithFee(Number(OPTION_BURN_VALUE.LOVE), burnAmountPerCoin, true)}
          burnValueWithoutFee={calBurnAmountWithoutFee(Number(OPTION_BURN_VALUE.LOVE), burnAmountPerCoin, true)}
          amountDana={Number(OPTION_BURN_VALUE.LOVE)}
          isUpBurn={true}
          hideReact={hideReact}
        />
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
            src={'/images/down-arrow.svg'}
            style={{
              filter: 'var(--filter-svg-red-color)'
            }}
            onClick={e => handleBurnOption(e, dataItem, OPTION_BURN_TYPE.DISLIKE, false)}
          />
        </div>
        <HintMobile>
          {Number(calBurnAmountWithFee(Number(OPTION_BURN_VALUE.DISLIKE), burnAmountPerCoin, true))}
          <span>{coinInfo[COIN.XPI].ticker}</span>
        </HintMobile>
      </Popover>
      <Popover arrow={false} overlayClassName="popover-custom-hint">
        <div className="container-ico-hover">
          <StyledBurnIconHover
            src={'/images/up-arrow.svg'}
            style={{
              filter: 'var(--filter-svg-blue-color)'
            }}
            onClick={e => handleBurnOption(e, dataItem, OPTION_BURN_TYPE.LIKE, true)}
          />
        </div>
        <HintMobile>
          {Number(calBurnAmountWithFee(Number(OPTION_BURN_VALUE.LIKE), burnAmountPerCoin, true))}{' '}
          <span>{coinInfo[COIN.XPI].ticker}</span>
        </HintMobile>
      </Popover>

      <Popover arrow={false} overlayClassName="popover-custom-hint">
        <div className="container-ico-hover">
          <StyledBurnIconHover
            src={'/images/double-up-arrow.svg'}
            style={{
              filter: 'var(--filter-svg-blue-color)'
            }}
            onClick={e => handleBurnOption(e, dataItem, OPTION_BURN_TYPE.LOVE, true)}
          />
        </div>
        <HintMobile>
          {Number(calBurnAmountWithFee(Number(OPTION_BURN_VALUE.LOVE), burnAmountPerCoin, true))}{' '}
          <span>{coinInfo[COIN.XPI].ticker}</span>
        </HintMobile>
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
        {isMobile && (
          <HintMobile>
            Custom <span>Burn</span>
          </HintMobile>
        )}
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
          padding: isMobile ? '30px 8px 8px 8px' : '0 8px 8px 8px',
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

        {burnForType === BurnForType.Post && burnValue && <Counter isShowXPI={true} num={burnValue ?? 0} />}
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
