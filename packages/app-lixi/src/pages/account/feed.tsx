import AccountHomeFeed from '@components/Common/AccountHomeFeed';
import MainLayout from '@components/Layout/MainLayout';

const FeedAccount = () => {
  return <AccountHomeFeed />;
};

FeedAccount.getLayout = children => <MainLayout children={children} />;

export default FeedAccount;
