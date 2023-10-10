import MainLayout from '@components/Layout/MainLayout';
import TokensFeed from '@components/Token/TokensFeed';
import { SagaStore, wrapper } from '@store/store';
import { useTokenQuery } from '@store/token/tokens.generated';
import _ from 'lodash';
import { NextSeo } from 'next-seo';
import { getSelectorsByUserAgent } from 'react-device-detect';
import { END } from 'redux-saga';
import { useCheckIfFollowTokenQuery } from '@store/follow/follows.api';
import { getSelectedAccount } from '@store/account';
import { useAppSelector } from '@store/hooks';
import { PrismaClient } from '@bcpros/lixi-prisma';

const TokenDetailPage = props => {
  const { tokenAsString, isMobile } = props;
  const token = JSON.parse(tokenAsString);
  const { tokenId } = token;
  const canonicalUrl = process.env.NEXT_PUBLIC_LIXI_URL + `token/${tokenId}`;
  const selectedAccount = useAppSelector(getSelectedAccount);

  const { currentData: currentDataCheckIsFollowed } = useCheckIfFollowTokenQuery(
    { tokenId },
    { skip: !selectedAccount || !token }
  );

  return (
    <>
      <NextSeo
        title="Tokens Feed"
        description="Share your opinion about this token."
        canonical={canonicalUrl}
        openGraph={{
          url: canonicalUrl,
          title: 'Lixi',
          images: [{ url: '' }],
          site_name: 'Lixi'
        }}
        twitter={{
          handle: '@handle',
          site: '@site',
          cardType: 'summary_large_image'
        }}
      />
      <TokensFeed token={token} checkIsFollowed={currentDataCheckIsFollowed?.checkIfFollowToken} isMobile={isMobile} />
    </>
  );
};

export const getServerSideProps = wrapper.getServerSideProps((store: SagaStore) => async context => {
  const { req } = context;
  const userAgent = req ? req.headers['user-agent'] : navigator.userAgent;
  const { isMobile } = getSelectorsByUserAgent(userAgent);
  const prisma = new PrismaClient();

  store.dispatch(END);
  await (store as SagaStore).__sagaTask.toPromise();

  const slug: string = _.isArray(context.params.slug) ? context.params.slug[0] : context.params.slug;
  const tokenId: string = slug;

  const token = await prisma.token.findUnique({
    where: {
      tokenId: tokenId
    }
  });

  if (!token) {
    return {
      notFound: true
    };
  }

  const tokenAsString = JSON.stringify(token);

  return {
    props: {
      tokenAsString,
      isMobile
    }
  };
});

TokenDetailPage.Layout = ({ children }) => <MainLayout children={children} />;

export default TokenDetailPage;
