import { Spin } from 'antd';
import { Account } from '@bcpros/lixi-models/lib/account/account.model';
import { useSliceSelector } from '@store/index';
import { getIsGlobalLoading } from '@store/loading/selectors';
import { CashLoadingIcon } from '@bcpros/lixi-components/components/Common/CustomIcons';
import AccountListItem from './AccountListItem';

type AccountListProps = {
  accounts: Account[];
};

const LixiList = ({ accounts }: AccountListProps) => {
  const isLoading = useSliceSelector(getIsGlobalLoading);

  return (
    <>
      <Spin spinning={isLoading} indicator={CashLoadingIcon}>
        <div style={{ paddingTop: '20px' }}>
          {accounts && accounts.length > 0 && accounts.map(item => <AccountListItem key={item.id} account={item} />)}
        </div>
      </Spin>
    </>
  );
};

export default LixiList;
