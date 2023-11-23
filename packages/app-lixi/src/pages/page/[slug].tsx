import { PrismaClient } from '@bcpros/lixi-prisma';
import MainLayout from '@components/Layout/MainLayout';
import PageDetail from '@components/Pages/PageDetail';
import { getSelectedAccount } from '@store/account';
import { useCheckIfFollowPageQuery } from '@store/follow/follows.api';
import { useAppSelector } from '@store/hooks';
import { usePageQuery } from '@store/page/pages.generated';
import { SagaStore, wrapper } from '@store/store';
import { toImageUrl } from '@utils/index';
import _ from 'lodash';
import { NextSeo } from 'next-seo';
import React from 'react';
import { getSelectorsByUserAgent } from 'react-device-detect';
import { END } from 'redux-saga';

const PageDetailPage = props => {
  const { pageAsString, isMobile } = props;
  const page = JSON.parse(pageAsString);
  const canonicalUrl = process.env.NEXT_PUBLIC_LIXI_URL + `page/${page.id}`;
  const selectedAccount = useAppSelector(getSelectedAccount);

  const { currentData: currentDataPageQuery } = usePageQuery({ id: page.id }, { skip: !page });

  const { currentData: currentDataCheckIsFollowed, isSuccess: isSuccessCheckIsFollowed } = useCheckIfFollowPageQuery(
    {
      pageId: page.id
    },
    { skip: !selectedAccount || !page }
  );

  const pageToRender = currentDataPageQuery?.page ?? page;

  return (
    <React.Fragment>
      <React.Fragment>
        <NextSeo
          title={page.name}
          description="A place where you have complete control on what you want to see and what you want others to see collectively. No platform influence. No platform ads."
          canonical={canonicalUrl}
          openGraph={{
            url: canonicalUrl,
            title: 'Lixi',
            description: page.description || 'Your Attention Your Money!',
            images: [{ url: '' }],
            site_name: 'Lixi'
          }}
          twitter={{
            handle: '@handle',
            site: '@site',
            cardType: 'summary_large_image'
          }}
        />
        <PageDetail
          page={pageToRender}
          isMobile={isMobile}
          checkIsFollowed={currentDataCheckIsFollowed?.checkIfFollowPage}
        />
      </React.Fragment>
    </React.Fragment>
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
  const pageId: string = slug;

  const deliveryUrl = process.env.NEXT_PUBLIC_CF_IMAGES_DELIVERY_URL;
  const cfAccountHash = process.env.NEXT_PUBLIC_CF_ACCOUNT_HASH;

  const dbValue = await prisma.page.findUnique({
    where: {
      id: pageId
    },
    include: {
      pageAccount: true,
      category: true,
      country: true,
      state: true,
      pageAvatarImageUploadable: {
        select: {
          uploads: true
        }
      },
      pageCoverImageUploadable: {
        select: {
          uploads: true
        }
      }
    }
  });

  if (!dbValue) {
    return {
      notFound: true
    };
  }

  const page = {
    ..._.omit(dbValue, 'country', 'state'),
    avatar: toImageUrl(deliveryUrl, cfAccountHash, dbValue.pageAvatarImageUploadable?.uploads[0]),
    cover: toImageUrl(deliveryUrl, cfAccountHash, dbValue.pageCoverImageUploadable?.uploads[0]),
    stateName: dbValue.state?.name || '',
    countryName: dbValue.country?.name || ''
  };

  const pageAsString = JSON.stringify(page);

  return {
    props: {
      pageAsString,
      isMobile
    }
  };
});

PageDetailPage.Layout = ({ children }) => <MainLayout children={children} />;

export default PageDetailPage;
