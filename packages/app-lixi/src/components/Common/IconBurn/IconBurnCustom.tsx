import { useContext, useState } from 'react';
import { StyledBurnIconHover } from '../Reaction';
import { useSliceDispatch } from '@store/index';
import { BurnForItem } from '@generated/types';
import { prepareBurnCommand } from '@store/burn';
import { BurnForType } from '@bcpros/lixi-models/lib/burn/burn.model';
import { AuthenticationContext, AuthorizationContext } from '@context/index';
import useAuthorization from '../Authorization/use-authorization.hooks';
import { Tooltip } from 'antd';
import { COIN } from '@bcpros/lixi-models/constants/coins/coin';
import { coinInfo } from '@bcpros/lixi-models/constants/coins/coin-info';

type IconBurnCustomProps = {
  icon: string;
  colorBackground: string;
  colorFilterIcon: string;
  burnForType: BurnForType;
  dataItem: BurnForItem;
  burnValueWithFee: number;
  burnValueWithoutFee: number;
  amountDana: number;
  isUpBurn: boolean;
  coinBurned: string;
  selectedHash: string;
  hashOwner: string;
  hideReact: () => void;
};

const IconBurnCustom = ({
  icon,
  colorBackground,
  colorFilterIcon,
  burnForType,
  dataItem,
  burnValueWithFee,
  burnValueWithoutFee,
  amountDana,
  isUpBurn,
  coinBurned,
  hashOwner,
  selectedHash,
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
          burnValue: burnValueWithoutFee.toString(),
          amountDana: amountDana,
          coinBurned: coinBurned as unknown as COIN
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
      <Tooltip
        title={`${selectedHash === hashOwner ? burnValueWithoutFee : burnValueWithFee} ${coinInfo[coinBurned].ticker}`}
      >
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
