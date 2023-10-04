import { Button, Col, Form, Input, Modal, Row, Select } from 'antd';
import isEmpty from 'lodash.isempty';
import React, { useEffect, useState } from 'react';
import intl from 'react-intl-universal';
import { getSelectedAccount } from '@store/account/selectors';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { getAllCountries, getAllStates } from '@store/country/selectors';
import { setPage } from '@store/page/action';
import { showToast } from '@store/toast/actions';
import { getCountries, getStates } from '@store/country/actions';
import _ from 'lodash';
import Image from 'next/image';
import { UpdatePageInput, Page, UpdateProductInput } from '@generated/types.generated';
import { api as pageApi, useUpdatePageMutation } from '@store/page/pages.generated';
import styled from 'styled-components';
import { closeModal } from '@store/modal/actions';
import { CreateForm } from '@components/Lixi/CreateLixiFormModal';
import { getAllCategories } from '@store/category/selectors';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { fromSmallestDenomination } from '@utils/cashMethods';
import { currency } from '@components/Common/Ticker';
import { Product } from '@bcpros/lixi-models';
import { useUpdateProductMutation } from '../../../../redux-store/src/store/product/products.generated';

const { TextArea } = Input;
const { Option } = Select;

type EditProductModalProps = {
  product: Product;
} & React.HTMLProps<HTMLElement>;

export const EditProductModal: React.FC<EditProductModalProps> = ({ product, disabled }: EditProductModalProps) => {
  const dispatch = useAppDispatch();
  const selectedAccount = useAppSelector(getSelectedAccount);

  const [
    updateProductTrigger,
    {
      isLoading: isLoadingUpdateProduct,
      isSuccess: isSuccessUpdateProduct,
      isError: isErrorUpdateProduct,
      error: errorOnUpdate
    }
  ] = useUpdateProductMutation();

  useEffect(() => {
    dispatch(getCountries());
  }, []);
  const categories = useAppSelector(getAllCategories);

  const {
    handleSubmit,
    formState: { errors },
    control
  } = useForm({
    defaultValues: {
      id: product.id,
      name: product.name,
      title: product.title,
      price: product.price,
      priceUnit: product.priceUnit,
      categoryId: product.categoryId,
      description: product.description,
      phoneNumber: product.phoneNumber
    }
  });

  const [componentDisabled, setComponentDisabled] = useState<boolean>(true);
  const onFormLayoutChange = ({ disabled }: { disabled: boolean }) => {
    setComponentDisabled(disabled);
  };

  const onSubmit: SubmitHandler<any> = async data => {
    try {
      const updateProductInput = {
        ...data,
        categoryId: Number(data.categoryId),
        uploadImages: product.productImages.map(img => img.id),
        pageId: product.page.id,
        id: product.id
      };
      console.log(product);
      console.log('product updated', updateProductInput);
      const productUpdated = await updateProductTrigger({ input: updateProductInput }).unwrap();
      dispatch(
        showToast('success', {
          message: 'Success',
          description: intl.get('page.updatePageSuccessful'),
          duration: 5
        })
      );
      //   dispatch(setPage({ ...pageUpdated.updatePage }));
      dispatch(closeModal());
    } catch (error) {
      const message = errorOnUpdate?.message ?? intl.get('page.unableUpdatePage');

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

  return (
    <>
      <Modal
        width={1192}
        className="custom-edit-page-modal"
        title={intl.get('page.updatePage')}
        open={true}
        onCancel={handleOnCancel}
        footer={null}
        style={{ top: '0 !important' }}
      >
        <CreateForm className="form-parent">
          <CreateForm
            className="form-child edit-page"
            layout="vertical"
            initialValues={{ disabled: componentDisabled }}
            onValuesChange={onFormLayoutChange}
            style={{ textAlign: 'start' }}
          >
            <Form.Item
              name="name"
              label={intl.get('page.name')}
              rules={[{ required: true, message: intl.get('page.inputName') }]}
            >
              <Controller
                name="name"
                control={control}
                rules={{
                  required: {
                    value: true,
                    message: intl.get('page.inputName')
                  },
                  pattern: {
                    value: /.+/,
                    message: intl.get('page.inputNamePattern')
                  }
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input value={value} onChange={onChange} onBlur={onBlur} />
                )}
              />
              <p style={{ display: errors.name ? 'flex' : 'none', color: 'var(--color-danger)' }}>
                {errors.name && errors.name.message}
              </p>
            </Form.Item>

            <Form.Item
              name="category"
              label={intl.get('page.category')}
              rules={[
                {
                  required: true,
                  message: intl.get('page.selectCategory')
                }
              ]}
            >
              <Controller
                name="categoryId"
                control={control}
                rules={{
                  required: {
                    value: true,
                    message: intl.get('page.selectCategory')
                  }
                }}
                render={({ field: { onChange, onBlur, value }, formState: { isSubmitting } }) => (
                  <Select
                    className="select-after edit-page"
                    showSearch
                    onChange={onChange}
                    onBlur={onBlur}
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
                    defaultValue={intl.get(
                      'category.' +
                        categories.find(category => category.id === Number(product.categoryId.toString())).name
                    )}
                    disabled={isSubmitting}
                  >
                    {categories.map(pageCategory => (
                      <Option key={pageCategory.id} value={pageCategory.id}>
                        {intl.get('category.' + pageCategory.name)}
                      </Option>
                    ))}
                  </Select>
                )}
              />
              <p style={{ display: errors.categoryId ? 'flex' : 'none', color: 'var(--color-danger)' }}>
                {errors.categoryId && errors.categoryId.message}
              </p>
            </Form.Item>
            <Form.Item name="price" label="Price" rules={[{ required: true, message: intl.get('page.inputName') }]}>
              <Controller
                name="price"
                control={control}
                rules={{
                  required: {
                    value: true,
                    message: intl.get('page.inputName')
                  },
                  pattern: {
                    value: /.+/,
                    message: intl.get('page.inputNamePattern')
                  }
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input value={value} onChange={onChange} onBlur={onBlur} />
                )}
              />
              <Controller
                name="priceUnit"
                control={control}
                rules={{
                  required: {
                    value: true,
                    message: intl.get('page.inputName')
                  },
                  pattern: {
                    value: /.+/,
                    message: intl.get('page.inputNamePattern')
                  }
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input value={value} onChange={onChange} onBlur={onBlur} />
                )}
              />
              <p style={{ display: errors.name ? 'flex' : 'none', color: 'var(--color-danger)' }}>
                {errors.name && errors.name.message}
              </p>
            </Form.Item>

            <Form.Item
              name="phoneNumber"
              label="Phone"
              rules={[{ required: true, message: intl.get('page.inputName') }]}
            >
              <Controller
                name="phoneNumber"
                control={control}
                rules={{
                  required: {
                    value: true,
                    message: intl.get('page.inputName')
                  },
                  pattern: {
                    value: /.+/,
                    message: intl.get('page.inputNamePattern')
                  }
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input value={value} onChange={onChange} onBlur={onBlur} />
                )}
              />
              <p style={{ display: errors.name ? 'flex' : 'none', color: 'var(--color-danger)' }}>
                {errors.name && errors.name.message}
              </p>
            </Form.Item>
            <Form.Item label={intl.get('page.description')}>
              <Controller
                name="description"
                control={control}
                render={({ field: { onChange, value } }) => <TextArea value={value} onChange={onChange} rows={5} />}
              />
            </Form.Item>
          </CreateForm>
        </CreateForm>

        <div style={{ textAlign: 'end', marginRight: '10px' }}>
          <Button type="primary" htmlType="submit" onClick={handleSubmit(onSubmit)}>
            {intl.get('page.editPage')}
          </Button>
        </div>
      </Modal>
    </>
  );
};
