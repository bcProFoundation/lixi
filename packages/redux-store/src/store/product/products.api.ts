import { api } from './products.generated';

const enhancedApi = api.enhanceEndpoints({
  addTagTypes: ['Product', 'CommentCreated'],
  endpoints: {
    Product: {
      providesTags: (result, error, arg) => ['Product', { type: 'Product', id: arg.id }, 'CommentCreated']
    },
    createProduct: {}
  }
});

export { enhancedApi as api };

export const { useProductQuery, useCreateProductMutation } = enhancedApi;
