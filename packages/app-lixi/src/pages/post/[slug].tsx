import { AnalyticEvent } from '@bcpros/lixi-models';
import { PrismaClient } from '@bcpros/lixi-prisma';
import MainLayout from '@components/Layout/MainLayout';
import PostDetail from '@components/Posts/PostDetail';
import { PostQueryItem } from '@generated/index';
import { analyticEvent } from '@store/analytic-event';
import { useAppDispatch } from '@store/hooks';
import { usePostQuery } from '@store/post/posts.generated';
import { SagaStore, wrapper } from '@store/store';
import _ from 'lodash';
import { NextSeo } from 'next-seo';
import React, { useEffect, useState } from 'react';
import { getSelectorsByUserAgent } from 'react-device-detect';
import intl from 'react-intl-universal';
import { END } from 'redux-saga';
import { stripHtml } from 'string-strip-html';

const PostDetailPage = props => {
  const dispatch = useAppDispatch();
  const { postId, isMobile, postAsString } = props;
  const initialPost = JSON.parse(postAsString);
  const canonicalUrl = process.env.NEXT_PUBLIC_LIXI_URL + `post/${postId}`;

  const [post, setPost] = useState(initialPost);
  const postQuery = usePostQuery({ id: postId });
  const { isLoading, isError, data } = postQuery;

  const document = new DOMParser().parseFromString(post.content, 'text/html');
  const paragraphElement = document.querySelector('.EditorLexical_paragraph');
  const paragraphText = paragraphElement?.textContent;

  useEffect(() => {
    // analytic event
    const payload: AnalyticEvent = {
      eventType: 'view',
      eventData: {
        id: postId,
        type: 'post'
      }
    };
    dispatch(analyticEvent(payload));
  }, [postId]);

  useEffect(() => {
    if (!isError && data && data.post) {
      setPost(data.post);
    }
  }, [data]);

  return (
    <React.Fragment>
      <NextSeo
        title={`${post?.account?.name} ${intl.get('post.on')} Lixi: "${paragraphText}"`}
        description="A place where you have complete control on what you want to see and what you want others to see collectively. No platform influence. No platform ads."
        canonical={canonicalUrl}
        openGraph={{
          url: canonicalUrl,
          title: 'Lixi',
          description: post.content
            ? `${post.account.name} at Lixi: "${stripHtml(post.content).result}"`
            : 'Your Attention Your Money!',
          images: [
            {
              url: `${process.env.NEXT_PUBLIC_LIXI_URL}images/lixilotus-logo.svg`,
              width: 800,
              height: 600,
              alt: 'Lotus Logo',
              type: 'image/jpeg'
            }
          ],
          site_name: `Posted by ${post.account.name}`
        }}
        twitter={{
          handle: '@lixilotus',
          site: '@lixilotus',
          cardType: 'summary_large_image'
        }}
        facebook={{
          appId: '264679442628200'
        }}
      />
      {postQuery && postQuery.isSuccess && (
        <PostDetail post={postQuery.data.post as PostQueryItem} isMobile={isMobile} />
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
  const postId: string = slug;

  const dbPost = await prisma.post.findUnique({
    where: {
      id: postId
    },
    include: {
      uploads: true,
      account: true,
      page: true,
      translations: true,
      reposts: { select: { account: true, accountId: true } },
      _count: {
        select: { reposts: true }
      },
      imageUploadable: {
        include: {
          uploads: true
        }
      }
    }
  });

  const postAsString = JSON.stringify(dbPost);

  return {
    props: {
      postAsString,
      postId,
      isMobile
    }
  };
});

PostDetailPage.Layout = ({ children }) => <MainLayout children={children} />;

export default PostDetailPage;
