import { api, ProductQuery } from './products.generated';

const enhancedApi = api.enhanceEndpoints({
  addTagTypes: ['Product'],
  endpoints: {
    Products: {
      providesTags: (result, error, arg) => ['Product'],
      serializeQueryArgs({ queryArgs }) {
        if (queryArgs) {
          const { orderBy, ...otherArgs } = queryArgs;
          return { orderBy };
        }
        return { queryArgs };
      },
      merge(currentCacheData, responseData) {
        currentCacheData.allProducts.edges.push(...responseData.allProducts.edges);
        currentCacheData.allProducts.pageInfo = responseData.allProducts.pageInfo;
        currentCacheData.allProducts.totalCount = responseData.allProducts.totalCount;
      }
    },
    ProductsByPageId: {
      providesTags: (result, error, arg) => ['Product'],
      serializeQueryArgs({ queryArgs }) {
        if (queryArgs) {
          const { orderBy, id, minBurnFilter, ...otherArgs } = queryArgs;
          return { orderBy, id, minBurnFilter };
        }
        return { queryArgs };
      },

      merge(currentCacheData, responseData) {
        currentCacheData.allProductsByPageId.edges.push(...responseData.allProductsByPageId.edges);
        currentCacheData.allProductsByPageId.pageInfo = responseData.allProductsByPageId.pageInfo;
        currentCacheData.allProductsByPageId.totalCount = responseData.allProductsByPageId.totalCount;
      }
    },
    createProduct: {},
    updateProduct: {}
  }
});

export { enhancedApi as api };

export const { useProductsByPageIdQuery, useProductsQuery, useCreateProductMutation } = enhancedApi;
