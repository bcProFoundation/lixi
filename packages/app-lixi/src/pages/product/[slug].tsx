import { PageInput } from '@bcpros/lixi-models';
import { PrismaClient } from '@bcpros/lixi-prisma';
import MainLayout from '@components/Layout/MainLayout';
import { SagaStore, wrapper } from '@store/store';
import _ from 'lodash';
import { NextSeo } from 'next-seo';
import { getSelectorsByUserAgent } from 'react-device-detect';
import { END } from 'redux-saga';
import { useProductQuery } from '../../../../redux-store/src/store/product/products.generated';

const ProductDetailPage = props => {
  const { productAsString, productId, isMobile } = props;
  // const product = JSON.parse(productAsString);
  const canonicalUrl = process.env.NEXT_PUBLIC_LIXI_URL + `pages/${productId}`;
  let currentProduct;
  let currentPage;
  let checkIsFollowed;
  let page: PageInput;
  const { currentData: currentDataProductQuery, isSuccess: isSuccessProductQuery } = useProductQuery({ id: productId });
  // const { currentData: currentDataPageQuery, isSuccess: isSuccessPageQuery } = usePageQuery({ id: product.page.id });
  // const { currentData: currentDataCheckIsFollowed, isSuccess: isSuccessCheckIsFollowed } = useCheckIfFollowPageQuery({
  //   pageId: product.page.id
  // });

  // if (isSuccessPageQuery && isSuccessCheckIsFollowed) {
  //   currentPage = currentDataPageQuery.page;
  //   checkIsFollowed = currentDataCheckIsFollowed.checkIfFollowPage;
  // }

  if (isSuccessProductQuery) {
    currentProduct = currentDataProductQuery.product;
  }

  return (
    <>
      {isSuccessProductQuery && (
        <>
          <NextSeo
            title="Lixi Program"
            description="The lixi program send you a small gift ."
            canonical={canonicalUrl}
            openGraph={{
              url: canonicalUrl,
              title: 'LixiLotus',
              description: currentProduct.page.description || 'LixiLotus allow you to giveaway your Lotus effortlessly',
              images: [{ url: '' }],
              site_name: 'LixiLotus'
            }}
            twitter={{
              handle: '@handle',
              site: '@site',
              cardType: 'summary_large_image'
            }}
          />
        </>
      )}
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
  const productId: string = slug;
  // const result = await prisma.product.findUnique({
  //   where: {
  //     id: productId
  //   },
  //   include: {
  //     page: {
  //       select: {
  //         id: true
  //       }
  //     }
  //   }
  // });
  // const productAsString = JSON.stringify(result);
  return {
    props: {
      // productAsString,
      productId,
      isMobile
    }
  };
});

ProductDetailPage.Layout = ({ children }) => <MainLayout children={children} />;

export default ProductDetailPage;
