import { useContext, useState } from 'react';
import { StyledBurnIconHover } from '../Reaction';
import { useSliceDispatch } from '@store/index';
import { BurnForItem } from '@generated/types';
import { prepareBurnCommand } from '@store/burn';
import { BurnForType } from '@bcpros/lixi-models/lib/burn/burn.model';
import { AuthenticationContext, AuthorizationContext } from '@context/index';
import useAuthorization from '../Authorization/use-authorization.hooks';
import { Tooltip } from 'antd';
import { coinInfo } from '@bcpros/lixi-models/constants/coins/coin-info';
import { COIN } from '@bcpros/lixi-models/constants/coins/coin';

type IconBurnCustomProps = {
  icon: string;
  colorBackground: string;
  colorFilterIcon: string;
  burnForType: BurnForType;
  dataItem: BurnForItem;
  burnValue: number;
  isUpBurn: boolean;
  hideReact: () => void;
};

const IconBurnCustom = ({
  icon,
  colorBackground,
  colorFilterIcon,
  burnForType,
  dataItem,
  burnValue,
  isUpBurn,
  hideReact
}: IconBurnCustomProps) => {
  const dispatch = useSliceDispatch();
  const authorization = useContext(AuthorizationContext);
  const askAuthorization = useAuthorization();
  const authentication = useContext(AuthenticationContext);

  const [isHover, setIsHover] = useState<boolean>(false);

  const handleBurnOption = async (e: React.MouseEvent<HTMLElement>, dataItem: BurnForItem, isUpVote: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    if (authorization.authorized) {
      if (authentication && authentication.isAuthenticationRequired && !authentication.isSignedIn) {
        await authentication.signIn();
      }

      dispatch(
        prepareBurnCommand({
          isUpVote,
          burnForItem: dataItem,
          burnForType,
          burnValue: burnValue.toString()
        })
      );
    } else {
      askAuthorization();
    }

    hideReact();
  };

  return (
    <div
      className={`container-ico-hover ${isHover ? 'ant-popover-open' : ''}`}
      style={{ backgroundColor: isHover ? colorBackground : '#fff' }}
      onMouseOver={() => {
        setIsHover(true);
      }}
      onMouseOut={() => {
        setIsHover(false);
      }}
    >
      <Tooltip title={`${burnValue} ${coinInfo[COIN.XPI].ticker}`}>
        <StyledBurnIconHover
          src={`/images/${icon}`}
          style={{
            filter: isHover ? 'var(--filter-svg-white-color)' : colorFilterIcon
          }}
          onClick={e => handleBurnOption(e, dataItem, isUpBurn)}
        />
      </Tooltip>
    </div>
  );
};

export default IconBurnCustom;
