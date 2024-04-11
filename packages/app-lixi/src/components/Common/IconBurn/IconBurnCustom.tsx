import { useContext, useState } from 'react';
import { StyledBurnIconHover } from '../Reaction';
import { useAppDispatch } from '@store/hooks';
import { OPTION_BURN_VALUE } from '@bcpros/lixi-models/constants';
import { BurnForItem } from '@generated/types';
import { prepareBurnCommand } from '@store/burn';
import { BurnForType } from '@bcpros/lixi-models/lib/burn';
import { AuthenticationContext, AuthorizationContext } from '@context/index';
import useAuthorization from '../Authorization/use-authorization.hooks';

type IconBurnCustomProps = {
  icon: string;
  colorBackground: string;
  colorFilterIcon: string;
  burnForType: BurnForType;
  dataItem: BurnForItem;
  optionBurnType: string;
  isUpBurn: boolean;
  hideReact: () => void;
};

const IconBurnCustom = ({
  icon,
  colorBackground,
  colorFilterIcon,
  burnForType,
  dataItem,
  optionBurnType,
  isUpBurn,
  hideReact
}: IconBurnCustomProps) => {
  const dispatch = useAppDispatch();
  const authorization = useContext(AuthorizationContext);
  const askAuthorization = useAuthorization();
  const authentication = useContext(AuthenticationContext);

  const [isHover, setIsHover] = useState<boolean>(false);

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
      <StyledBurnIconHover
        src={`/images/${icon}`}
        style={{
          filter: isHover ? 'var(--filter-svg-white-color)' : colorFilterIcon
        }}
        onClick={e => handleBurnOption(e, dataItem, optionBurnType, isUpBurn)}
      />
    </div>
  );
};

export default IconBurnCustom;
