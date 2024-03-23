import { Product } from '@bcpros/lixi-models';
import { CreateForm } from '@components/Lixi/CreateLixiFormModal';
import { getSelectedAccount } from '@store/account/selectors';
import { getAllCategories } from '@store/category/selectors';
import { getCountries } from '@store/country/actions';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { closeModal } from '@store/modal/actions';
import { Button, Form, Input, Modal, Select } from 'antd';
import React, { useEffect, useState } from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import intl from 'react-intl-universal';

const { TextArea } = Input;
const { Option } = Select;

type EditProductModalProps = {
  product: Product;
} & React.HTMLProps<HTMLElement>;

export const EditProductModal: React.FC<EditProductModalProps> = ({ product, disabled }: EditProductModalProps) => {
  const dispatch = useAppDispatch();
  const selectedAccount = useAppSelector(getSelectedAccount);

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
      dispatch(closeModal());
    } catch (error) {}
  };

  const handleOnCancel = () => {
    dispatch(closeModal());
  };

  return <>
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
  </>;
};
