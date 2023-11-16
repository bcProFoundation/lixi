import MainLayout from '@components/Layout/MainLayout';
import PageHomeFeed from '@components/Pages/PageHomeFeed';

const FeedPage = () => {
  return <PageHomeFeed />;
};

FeedPage.Layout = ({ children }) => <MainLayout children={children} />;

export default FeedPage;
