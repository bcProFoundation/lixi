import { ProductItem } from '@components/Pages/PageDetail';
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Button, Carousel, Image } from 'antd';
import { DeleteOutlined, EditOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import Slider from 'react-slick';
import Reaction from '@components/Common/Reaction';
import { ShareSocialButton } from '@components/Common/ShareSocialButton';
import _ from 'lodash';
import { getSelectedAccountId } from '../../../../redux-store/src/store/account';
import { useAppDispatch, useAppSelector } from '../../../../redux-store/src/store/hooks';
import { openModal } from '../../../../redux-store/src/store/modal/actions';
import { useDeleteProductMutation } from '../../../../redux-store/src/store/product/products.generated';
import { DeleteProductInput, OrderDirection, ProductOrderField } from '@generated/types.generated';
import { api as productApi } from '@store/product/products.api';

type ProductDetailProps = {
  product: ProductItem;
  isMobile: boolean;
};
const captionStyle = {
  fontSize: '2em',
  fontWeight: 'bold'
};
const slideNumberStyle = {
  fontSize: '20px',
  fontWeight: 'bold'
};
const StyledContainerProductDetail = styled.div`
  margin: 1rem auto;
  width: 100%;
  max-width: 816px;
  border-radius: 5px;
  background: white;
  padding: 0rem 1rem 1rem 1rem;
  margin-top: 1rem;
  height: max-content;
  border-radius: 1rem;
  .carousel-container {
    margin-top: 10px;
    .ant-image-img {
      max-height: 50vh;
      min-height: 50vh;
      object-fit: cover;
    }
    .slick-next {
      opacity: 0;
    }
    .slick-prev {
      opacity: 0;
    }
  }
  .slick-dots {
    bottom: -50px;
  }
  .slick-dots li {
    width: auto;
    height: auto;
    margin: 4px;
    img {
      filter: grayscale(100%);
    }
    @media (max-width: 476px) {
      img {
        width: 25px;
      }
    }
    &.slick-active {
      img {
        filter: grayscale(0);
      }
    }
  }
  .slick-slide img {
    object-fit: cover;
    width: 100%;
  }

  .wrapper-avatar {
  }

  header {
    padding: 0 !important;
    margin-bottom: 1rem;
    border-color: #c5c5c5;
  }

  .comment-item-meta {
    margin-bottom: 0.5rem;
    .ant-list-item-meta-avatar {
      margin-top: 3%;
    }
    .ant-list-item-meta-title {
      margin-bottom: 0.5rem;
    }
  }
`;
const ActionBar = styled.div`
  display: flex;
  justify-content: space-between;
  background: #fff;
  border-left: 0;
  border-right: 0;
  transition: border-color 0.2s ease 0s;
  margin-top: 40px;
  .ant-space {
    gap: 4px !important;
  }
  .reaction-func {
    color: rgba(30, 26, 29, 0.6);
    cursor: pointer;
    display: flex;
    gap: 1rem;
    img {
      width: 28px;
      height: 28px;
      margin-right: 4px;
    }
  }
`;

export const GroupIconText = styled.div`
  align-items: center;
  display: flex;
  .ant-space {
    cursor: pointer;
    margin-right: 1rem;
    align-items: end;
    border-radius: 12px;
    cursor: pointer;
    @media (max-width: 960px) {
      margin-right: 1rem;
    }
  }
  img {
    width: 28px;
    height: 28px;
  }
  .count {
    color: rgba(30, 26, 29, 0.6);
    font-size: 12px;
  }
`;

const ProductDetail = ({ product }: ProductDetailProps) => {
  const selectedAccountId = useAppSelector(getSelectedAccountId);
  const dispatch = useAppDispatch();

  const mapProductItem = productItem => {
    let mapListImageSrc = null;
    if (productItem && productItem.productImages && productItem.productImages.length > 1) {
      mapListImageSrc = productItem.productImages.map(img => {
        const imgUrl = `${process.env.NEXT_PUBLIC_AWS_ENDPOINT}/${img.upload.bucket}/${img.upload.sha}`;
        return imgUrl;
      });
    } else {
      // return ['/images/default-avatar.jpg'];
    }
    let newItemObj = {
      id: productItem?.id,
      priceUnit: productItem?.priceUnit,
      title: productItem?.title,
      name: productItem?.name,
      productImages: mapListImageSrc && mapListImageSrc.length > 0 ? mapListImageSrc : ['/images/default-cover.jpg'],
      price: productItem?.price,
      description: productItem?.description,
      pageAccountID: productItem?.page.pageAccountId
    };
    return newItemObj;
  };
  const [productDetailData, setProductDetailData] = useState<any>();
  const onChange = (currentSlide: number) => {
    console.log(currentSlide);
  };

  useEffect(() => {
    const productMap = mapProductItem(product);
    console.log('product map', productMap);
    setProductDetailData(productMap);
  }, []);

  const settings = {
    customPaging: i => (
      <a>
        {/* {i + 1} */}
        {/* <img width="50px" src="https://s3.amazonaws.com/static.neostack.com/img/react-slick/abstract01.jpg" /> */}
        {<img height="30px" width="50px " src={productDetailData.productImages[i]} />}
      </a>
    ),
    dots: true,
    dotsClass: 'slick-dots slick-thumb',
    infinite: false,
    speed: 1000,
    slidesToShow: 1,
    slidesToScroll: 1,
    adaptiveHeight: true,
    fade: true,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 3,
          infinite: true,
          dots: true
        }
      },
      {
        breakpoint: 600,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 2,
          initialSlide: 2
        }
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1
        }
      }
    ]
  };
  function handleBurnForPost(isUpVote: boolean, post: any, optionBurn?: string): Promise<void> {
    throw new Error('Function not implemented.');
  }

  const navigateEditProduct = () => {
    dispatch(openModal('EditProductModal', { product }));
  };
  const [
    deleteProductTrigger,
    {
      isLoading: isLoadingDeleteProduct,
      isSuccess: isSuccessDeleteProduct,
      isError: isErrorDeleteProduct,
      error: errorOnDelete
    }
  ] = useDeleteProductMutation();
  const navigateDeleteProduct = async () => {
    const listUploadId =
      product.productImages && product.productImages.length > 0
        ? product.productImages.map(uploadDetail => uploadDetail.upload.id)
        : [];
    const deleteProductInput: DeleteProductInput = {
      id: product.id,
      uploadImages: listUploadId
    };
    const productDeleted = await deleteProductTrigger({ input: deleteProductInput }).unwrap();
    const params = {
      orderBy: {
        direction: OrderDirection.Desc,
        field: ProductOrderField.UpdatedAt
      }
    };
    if (!!productDeleted) {
      dispatch(
        productApi.util.updateQueryData(
          'ProductsByPageId',
          {
            ...params,
            minBurnFilter: 1,
            id: product.page.id
          },
          draft => {
            const productDeletedIndex = draft.allProductsByPageId.edges.findIndex(item => item.node.id === product.id);
            const productDeleted = draft.allProductsByPageId.edges[productDeletedIndex];
          }
        )
      );
    }
  };

  return (
    <React.Fragment>
      {!!productDetailData && (
        <>
          {selectedAccountId !== productDetailData?.pageAccountId && (
            <StyledContainerProductDetail>
              <Button
                style={{ marginRight: '1rem' }}
                type="primary"
                className="outline-btn"
                onClick={navigateEditProduct}
              >
                <EditOutlined />
                Edit Product
              </Button>

              <Button
                style={{ marginRight: '1rem' }}
                type="primary"
                className="outline-btn"
                onClick={navigateDeleteProduct}
              >
                <DeleteOutlined />
                Delete Product
              </Button>
            </StyledContainerProductDetail>
          )}
          <StyledContainerProductDetail>
            <div style={{ display: 'flex', flexFlow: 'column' }}>
              <div className="carousel-container">
                <Image.PreviewGroup>
                  <Slider {...settings}>
                    {!!productDetailData.productImages &&
                      productDetailData.productImages.length > 0 &&
                      productDetailData.productImages.map((item, index) => {
                        return (
                          <div>
                            <Image src={item} />
                          </div>
                        );
                      })}
                  </Slider>
                </Image.PreviewGroup>
              </div>
              <ActionBar>
                <GroupIconText>
                  <Reaction post={null} handleBurnForPost={handleBurnForPost} />
                </GroupIconText>
                <ShareSocialButton slug={null} content={null} postAccountName={'abc'} />
              </ActionBar>
              <h1
                style={{
                  fontSize: '32px',
                  fontWeight: '500',
                  alignSelf: 'flex-start',
                  textAlign: 'left'
                }}
              >
                {productDetailData.title}
              </h1>
              <div style={{ fontSize: '24px', fontWeight: '500', textAlign: 'left' }}>
                {productDetailData.price} {productDetailData.priceUnit}
              </div>
            </div>
          </StyledContainerProductDetail>

          <StyledContainerProductDetail>
            <div style={{ display: 'flex', flexFlow: 'column', paddingTop: '20px' }}>
              <div style={{ fontSize: '32px', fontWeight: '500', textAlign: 'left' }}>Mô tả chi tiết</div>
              <div style={{ fontSize: '20px', textAlign: 'left', paddingTop: '20px' }}>
                {productDetailData.description}
              </div>
            </div>
          </StyledContainerProductDetail>
        </>
      )}
    </React.Fragment>
  );
};
export default ProductDetail;
