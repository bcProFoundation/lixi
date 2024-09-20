import React from 'react';
import { PrismaClient } from '@bcpros/lixi-prisma';
import MainLayout from '@components/Layout/MainLayout';
import ProfileDetail from '@components/Profile/ProfileDetail';
import { useCheckIfFollowAccountQuery } from '@store/follow/follows.api';
import { SagaStore, wrapper } from 'src/store/store';
import _ from 'lodash';
import { NextSeo } from 'next-seo';
import { getSelectorsByUserAgent } from 'react-device-detect';
import { END } from 'redux-saga';
import { toImageUrl } from '@utils/index';
import { useGetAccountByAddressQuery } from '@store/account/accounts.api';
import { useRouter } from 'next/router';

const ProfileDetailPage = props => {
  const { userAddress, isMobile, accountAsString } = props;
  const account = JSON.parse(accountAsString ?? '{}');
  const router = useRouter();
  const accountAddress = router.query?.slug ?? '';

  const { currentData: currentDataProfile } = useGetAccountByAddressQuery(
    { address: accountAddress as string },
    { skip: !accountAddress }
  );
  const accountToRender = currentDataProfile?.getAccountByAddress ?? account;

  const { currentData: currentIsFollowedData, isSuccess: isSuccessCheckFollowed } = useCheckIfFollowAccountQuery(
    {
      followingAccountId: accountToRender.id
    },
    { skip: !accountToRender?.id }
  );

  let isFollowed;
  if (isSuccessCheckFollowed && currentIsFollowedData) {
    isFollowed = currentIsFollowedData.checkIfFollowAccount;
  }
  const canonicalUrl = process.env.NEXT_PUBLIC_LIXI_URL + `profile/${accountAddress}`;

  let linkShare;
  if (accountToRender?.cover) {
    linkShare = accountToRender.cover;
  } else if (accountToRender?.avatar) {
    linkShare = accountToRender.avatar;
  } else {
    linkShare = process.env.NEXT_PUBLIC_LIXI_URL + 'images/default-avatar.jpg';
  }

  return (
    <React.Fragment>
      {account && (
        <React.Fragment>
          <NextSeo
            title={accountToRender?.name}
            description="A place where you have complete control on what you want to see and what you want others to see collectively. No platform influence. No platform ads."
            canonical={canonicalUrl}
            openGraph={{
              url: canonicalUrl,
              title: accountToRender?.name,
              description: accountToRender?.description || 'Your Attention Your Money!',
              images: [{ url: linkShare }],
              site_name: 'Lixi'
            }}
            twitter={{
              handle: '@handle',
              site: '@site',
              cardType: 'summary_large_image'
            }}
          />
          <ProfileDetail user={accountToRender} isMobile={isMobile} checkIsFollowed={isFollowed} />
        </React.Fragment>
      )}
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
  const userAddress: string = slug;

  const account = await prisma.account.findFirst({
    where: {
      address: userAddress
    },
    orderBy: {
      updatedAt: 'desc'
    },
    include: {
      accountAvatarImageUploadable: {
        select: {
          uploads: true
        }
      },
      accountCoverImageUploadable: {
        select: {
          uploads: true
        }
      }
    }
  });

  if (!account) {
    return {
      notFound: true
    };
  }

  let followersCount = 0;
  let followingsCount = 0;
  let followingPagesCount = 0;
  const deliveryUrl = process.env.NEXT_PUBLIC_CF_IMAGES_DELIVERY_URL;
  const cfAccountHash = process.env.NEXT_PUBLIC_CF_ACCOUNT_HASH;

  const followingsCountPromise = prisma.followAccount.count({
    where: { followerAccountId: account.id }
  });
  const followersCountPromise = prisma.followAccount.count({
    where: { followingAccountId: account.id }
  });
  const followingPagesCountPromise = prisma.followPage.count({
    where: { accountId: account.id }
  });

  [followersCount, followingsCount, followingPagesCount] = await Promise.all([
    followersCountPromise,
    followingsCountPromise,
    followingPagesCountPromise
  ]);

  const result = {
    ..._.omit(account, 'accountAvatarImageUploadable', 'accountCoverImageUploadable'),
    avatar: toImageUrl(deliveryUrl, cfAccountHash, account.accountAvatarImageUploadable?.uploads[0]),
    cover: toImageUrl(deliveryUrl, cfAccountHash, account.accountCoverImageUploadable?.uploads[0]),
    followersCount: followersCount,
    followingsCount: followingsCount,
    followingPagesCount: followingPagesCount
  };
  const accountAsString = JSON.stringify(result);

  return {
    props: {
      accountAsString,
      userAddress,
      isMobile
    }
  };
});

ProfileDetailPage.getLayout = children => <MainLayout>{children}</MainLayout>;

export default ProfileDetailPage;
