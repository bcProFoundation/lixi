import MainLayout from '@components/Layout/MainLayout';
import PageHomeFeed from '@components/Pages/PageHomeFeed';

const FeedPage = () => {
  return <PageHomeFeed />;
};

FeedPage.getLayout = ({ children }) => <MainLayout>{children}</MainLayout>;

export default FeedPage;
