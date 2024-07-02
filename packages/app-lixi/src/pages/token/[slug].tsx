import { PrismaClient } from '@bcpros/lixi-prisma';
import MainLayout from '@components/Layout/MainLayout';
import TokensFeed from '@components/Token/TokensFeed';
import { getSelectedAccount } from '@store/account';
import { useCheckIfFollowTokenQuery } from '@store/follow/follows.api';
import { useSliceSelector } from '@store/index';
import { AppThunkDispatch, SagaStore, wrapper } from 'src/store/store';
import { useTokenQuery } from '@store/token/tokens.api';
import _ from 'lodash';
import { NextSeo } from 'next-seo';
import { getSelectorsByUserAgent } from 'react-device-detect';
import { END } from 'redux-saga';

const TokenDetailPage = props => {
  const { tokenAsString, isMobile } = props;
  const token = JSON.parse(tokenAsString);
  const { id, tokenId } = token;
  const canonicalUrl = process.env.NEXT_PUBLIC_LIXI_URL + `token/${tokenId}`;
  const selectedAccount = useSliceSelector(getSelectedAccount);

  const { currentData: currentDataTokenQuery } = useTokenQuery({ id: id }, { skip: !selectedAccount || !token });

  const { currentData: currentDataCheckIsFollowed } = useCheckIfFollowTokenQuery(
    { tokenId },
    { skip: !selectedAccount || !token }
  );

  const tokenToRender = currentDataTokenQuery?.token ?? token;

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
      <TokensFeed
        token={tokenToRender}
        checkIsFollowed={currentDataCheckIsFollowed?.checkIfFollowToken}
        isMobile={isMobile}
      />
    </>
  );
};

export const getServerSideProps = wrapper.getServerSideProps((store: SagaStore) => async context => {
  const { req } = context;
  const userAgent = req ? req.headers['user-agent'] : navigator.userAgent;
  const { isMobile } = getSelectorsByUserAgent(userAgent);
  const prisma = new PrismaClient();

  const thunkDispatch = store.dispatch as AppThunkDispatch;

  const slug: string = _.isArray(context.params.slug) ? context.params.slug[0] : context.params.slug;
  const tokenId: string = slug;

  // thunkDispatch(tokenApi.endpoints.TokenByTokenId.initiate({ tokenId: tokenId }));
  // await Promise.all(thunkDispatch(tokenApi.util.getRunningQueriesThunk()))

  store.dispatch(END);
  await (store as SagaStore).__sagaTask.toPromise();

  const dbToken = await prisma.token.findUnique({
    where: {
      tokenId: tokenId
    }
  });

  if (!dbToken) {
    return {
      notFound: true
    };
  }

  const tokenAsString = JSON.stringify(dbToken);

  return {
    props: {
      tokenAsString,
      isMobile
    }
  };
});

TokenDetailPage.getLayout = children => <MainLayout>{children}</MainLayout>;

export default TokenDetailPage;
