import { UPLOAD_TYPES } from '@bcpros/lixi-models/constants';
import { MultiUploader } from '@components/Common/Uploader/MultiUploader';
import { WalletContext } from '@context/walletProvider';
import { PageQueryItem } from '@generated/index';
import { CreateProductInput } from '@generated/types.generated';
import useXPI from '@hooks/useXPI';
import { getProductImageUploads, getSelectedAccount } from '@store/account/selectors';
import { getAllCategories } from '@store/category/selectors';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { closeModal } from '@store/modal/actions';
import { useCreateProductMutation } from '@store/product/products.generated';
import { showToast } from '@store/toast/actions';
import { getAllWalletPaths, getSlpBalancesAndUtxos } from '@store/wallet';
import { getUtxoWif } from '@utils/cashMethods';
import { Button, Form, Input, Modal, Select } from 'antd';
import isEmpty from 'lodash.isempty';
import router from 'next/router';
import React, { useRef, useState } from 'react';
import intl from 'react-intl-universal';
import Gallery from 'react-photo-gallery';
import styled from 'styled-components';
import { currency } from '../Common/Ticker';
const { TextArea } = Input;
const { Option } = Select;

const TextCustom = styled.p`
  padding-left: 20px;
  margin-top: 4px;
  padding-left: 0;
  font-family: 'Roboto';
  font-style: normal;
  font-weight: 400;
  font-size: 12px;
  line-height: 16px;
  display: flex;
  align-items: center;
  letter-spacing: 0.4px;
  color: #4e444b;
`;

const StyledEditorLexical = styled.div`
  display: flex;
  flex-direction: column;
  position: relative;

  // Customine Editor Lexical
  .EditorLexical_container {
    background: #fff;
    position: relative;
  }

  .EditorLexical_root {
    border: 0;
    font-size: 15px;
    display: block;
    position: relative;
    tab-size: 1;
    outline: 0;
    padding: 8px 8px;
    min-height: calc(100% - 16px);
    margin-bottom: 24px;
  }

  .EditorLexical_hashtag {
    background: #ffd7f6;
  }

  .EditorLexical_placeholder {
    font-size: 15px;
    color: #999;
    overflow: hidden;
    position: absolute;
    text-overflow: ellipsis;
    top: 8px;
    left: 8px;
    right: 8px;
    user-select: none;
    white-space: nowrap;
    display: inline-block;
    pointer-events: none;
  }

  .EditorLexical_action {
    display: flex;
    align-items: center;
    justify-content: start;
  }

  .EditorLexical_submit {
    width: fit-content;
    align-self: flex-end;
    min-width: 140px;
    position: absolute;
    bottom: 0;
  }

  .EditorLexical_pictures {
    max-width: 100%;
    margin-bottom: 2rem;
  }
`;

type CreateProductModalProps = {
  page?: PageQueryItem;
  accountId?: Number;
  pageId: string;
} & React.HTMLProps<HTMLElement>;

export const CreateProductModal: React.FC<CreateProductModalProps> = ({
  page,
  accountId,
  pageId,
  disabled
}: CreateProductModalProps) => {
  const dispatch = useAppDispatch();
  const pathname = router.pathname ?? '';
  const walletPaths = useAppSelector(getAllWalletPaths);
  const Wallet = React.useContext(WalletContext);
  const { XPI, chronik } = Wallet;
  const { sendXpi } = useXPI();
  const selectedAccount = useAppSelector(getSelectedAccount);
  const postCoverUploads = useAppSelector(getProductImageUploads);
  const slpBalancesAndUtxos = useAppSelector(getSlpBalancesAndUtxos);

  const multiUploader = useRef(null);
  const imagesList = postCoverUploads.map(img => {
    const imgUrl = `${process.env.NEXT_PUBLIC_AWS_ENDPOINT}/${img.bucket}/${img.sha}`;
    let width = img?.width || 4;
    let height = img?.height || 3;
    let objImg = {
      src: imgUrl,
      width: width,
      height: height
    };
    return objImg;
  });
  const [
    createProductTrigger,
    { isLoading: isLoadingCreatePage, isSuccess: isSuccessCreatePage, isError: isErrorCreatePage, error: errorOnCreate }
  ] = useCreateProductMutation();

  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const categories = useAppSelector(getAllCategories);
  const unitPrices = ['VND', 'USD'];
  // New product name
  const [newProductName, setNewProductName] = useState('');
  const [newProductNameIsValid, setNewProductNameIsValid] = useState(true);

  // New product category
  const [newProductCategory, setNewProductCategory] = useState('');
  const [newProductCategoryIsValid, setNewProductCategoryIsValid] = useState(true);

  // New product description
  const [newProductDescription, setNewProductDescription] = useState('');
  const [newProductDescriptionIsValid, setNewProductDescriptionIsValid] = useState(true);

  // New product image
  const [newProductImage, setNewProductImage] = useState('');
  const [newProductImageIsValid, setNewProductImageIsValid] = useState(true);

  // New product price
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductPriceIsValid, setNewProductPriceIsValid] = useState(true);

  // New product price unit
  const [newProductPriceUnit, setNewProductPriceUnit] = useState('');
  const [newProductPriceUnitIsValid, setNewProductPriceUnitIsValid] = useState(true);

  // New product phone number
  const [newProductPhoneNumber, setNewProductPhoneNumber] = useState('');
  const [newProductPhoneNumberIsValid, setNewProductPhoneNumberIsValid] = useState(true);

  const [componentDisabled, setComponentDisabled] = useState<boolean>(true);
  const onFormLayoutChange = ({ disabled }: { disabled: boolean }) => {
    setComponentDisabled(disabled);
  };

  const handleNewProductNameInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setNewProductName(value);
    setNewProductNameIsValid(true);
  };

  const handleNewProductPhoneNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setNewProductPhoneNumber(value);
    setNewProductPhoneNumberIsValid(true);
  };

  const handleNewProductPriceInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setNewProductPrice(value);
    setNewProductPriceIsValid(true);
  };

  const handleChangeCategory = (value: string) => {
    setNewProductCategory(value);
    if (value && !isEmpty(value)) {
      setNewProductCategoryIsValid(true);
    }
  };

  const handleChangePriceUnit = (value: string) => {
    setNewProductPriceUnit(value);
    if (value && !isEmpty(value)) {
      setNewProductPriceUnitIsValid(true);
    }
  };

  const handleNewProductDescriptionInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { value } = e.target;
    setNewProductDescription(value);
    setNewProductDescriptionIsValid(true);
  };

  // Only enable CreateLixi button if all form entries are valid
  let createPageFormDataIsValid = newProductName && newProductCategory;

  const handleOnCreateNewProduct = async ({ htmlContent, pureContent }) => {
    if (!createPageFormDataIsValid && !selectedAccount.id) {
      dispatch(
        showToast('error', {
          message: intl.get('page.unableCreatePage'),
          description: intl.get('page.selectAccountFirst'),
          duration: 5
        })
      );
    }

    let createFeeHex;
    if (pathname.includes('/page')) {
      try {
        if (selectedAccount.id != page.pageAccountId && parseFloat(page.createPostFee) != 0) {
          const fundingWif = getUtxoWif(slpBalancesAndUtxos.nonSlpUtxos[0], walletPaths);
          createFeeHex = await sendXpi(
            XPI,
            chronik,
            walletPaths,
            slpBalancesAndUtxos.nonSlpUtxos,
            currency.defaultFee,
            '',
            false, // indicate send mode is one to one
            null,
            page.pageAccount.address,
            page.createPostFee,
            true,
            fundingWif,
            true
          );
        }
      } catch (error) {
        throw new Error(intl.get('account.insufficientFunds'));
      }
    }

    const createProductInput: CreateProductInput = {
      name: newProductName,
      title: newProductName,
      htmlContent: htmlContent,
      pureContent: pureContent,
      categoryId: Number(newProductCategory),
      description: newProductDescription,
      price: Number(newProductPrice),
      phoneNumber: newProductPhoneNumber,
      priceUnit: newProductPriceUnit,
      pageId: pageId,
      createFeeHex: createFeeHex,
      uploads: postCoverUploads.map(upload => {
        return upload.id;
      })
    };

    try {
      if (createProductInput) {
        console.log(createProductInput);
        const productCreated = await createProductTrigger({ input: createProductInput }).unwrap();
        dispatch(
          showToast('success', {
            message: 'Success',
            description: intl.get('page.createPageSuccessful'),
            duration: 5
          })
        );
        dispatch(closeModal());
        // dispatch(setPage({ ...pageCreated.createPage }));
        // router.push(`/page/${pageCreated.createPage.id}`);
      }
    } catch (error) {
      const message = errorOnCreate?.message ?? intl.get('page.unableCreatePageServer');

      dispatch(
        showToast('error', {
          message: 'Error',
          description: message,
          duration: 5
        })
      );
    }
  };

  const handleOnCancel = () => {
    dispatch(closeModal());
  };

  const setUploadingImage = state => {
    setIsUploadingImage(state);
  };

  return (
    <>
      {selectedAccount && selectedAccount.address ? (
        <Modal
          width={400}
          className="custom-create-page-modal"
          title="Create new product"
          open={true}
          onCancel={handleOnCancel}
          footer={
            <Button
              type="primary"
              htmlType="submit"
              onClick={() =>
                handleOnCreateNewProduct({
                  htmlContent: '',
                  pureContent: ''
                })
              }
              disabled={!createPageFormDataIsValid}
            >
              {intl.get('page.createPage')}
            </Button>
          }
          style={{ top: '0 !important' }}
        >
          <Form
            layout="vertical"
            initialValues={{ disabled: componentDisabled }}
            onValuesChange={onFormLayoutChange}
            style={{ textAlign: 'start' }}
          >
            <Form.Item name="name" label="Title" rules={[{ required: true, message: intl.get('page.inputName') }]}>
              <Input defaultValue={newProductName} onChange={e => handleNewProductNameInput(e)} />
            </Form.Item>

            <Form.Item name="price" label="Price" rules={[{ required: true, message: intl.get('page.inputName') }]}>
              <div style={{ display: 'flex', flexFlow: 'row' }}>
                <Input
                  style={{ flex: 3 }}
                  defaultValue={newProductPrice}
                  onChange={e => handleNewProductPriceInput(e)}
                />
                <Select
                  style={{ flex: 1, borderTopLeftRadius: 'unset !important' }}
                  className="select-after edit-page"
                  showSearch
                  onChange={handleChangePriceUnit}
                  placeholder="Price Unit"
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    (option!.children as unknown as string).toLocaleLowerCase().includes(input)
                  }
                  filterSort={(optionA, optionB) =>
                    (optionA!.children as unknown as string)
                      .toLowerCase()
                      .localeCompare((optionB!.children as unknown as string).toLowerCase())
                  }
                >
                  {unitPrices.map(unitPrice => (
                    <Option key={unitPrice}>{unitPrice}</Option>
                  ))}
                </Select>
              </div>

              {/* <TextCustom>{intl.get('text.createPageName')}</TextCustom> */}
            </Form.Item>

            <Form.Item
              name="category"
              label={intl.get('page.category')}
              rules={[{ required: true, message: intl.get('page.selectCategory') }]}
            >
              <Select
                className="select-after edit-page"
                showSearch
                onChange={handleChangeCategory}
                placeholder={intl.get('page.category')}
                optionFilterProp="children"
                filterOption={(input, option) =>
                  (option!.children as unknown as string).toLocaleLowerCase().includes(input)
                }
                filterSort={(optionA, optionB) =>
                  (optionA!.children as unknown as string)
                    .toLowerCase()
                    .localeCompare((optionB!.children as unknown as string).toLowerCase())
                }
                style={{ width: '99%', textAlign: 'start' }}
              >
                {categories.map(pageCategory => (
                  <Option key={pageCategory.id}>{intl.get('category.' + pageCategory.name)}</Option>
                ))}
              </Select>
              <TextCustom>{intl.get('text.createPageCategory')}</TextCustom>
            </Form.Item>

            <Form.Item label={intl.get('page.description')}>
              <TextArea onChange={e => handleNewProductDescriptionInput(e)} rows={4} />
              <TextCustom>{intl.get('text.createPageDescription')}</TextCustom>
            </Form.Item>
            <Form.Item name="phoneNumber" label="Phone number">
              <Input onChange={e => handleNewProductPhoneNumber(e)} />
            </Form.Item>
            <Form.Item></Form.Item>
            <Form.Item>
              <StyledEditorLexical>
                <Gallery photos={imagesList} />
                <MultiUploader
                  ref={multiUploader}
                  type={UPLOAD_TYPES.PRODUCT}
                  isIcon={false}
                  buttonName="Upload image"
                  buttonType="primary"
                  icon={'/images/ico-picture.svg'}
                  showUploadList={false}
                  setUploadingImage={setUploadingImage}
                />
              </StyledEditorLexical>
            </Form.Item>
          </Form>
        </Modal>
      ) : (
        intl.get('page.selectAccountFirst')
      )}
    </>
  );
};
