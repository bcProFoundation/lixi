import { api } from './fiat-currency.generated';

const enhancedApi = api.enhanceEndpoints({
  addTagTypes: [],
  endpoints: {
    GetFiatRate: {},
    GetAllFiatRate: {}
  }
});

export { enhancedApi as api };

export const { useGetFiatRateQuery, useLazyGetFiatRateQuery, useGetAllFiatRateQuery, useLazyGetAllFiatRateQuery } =
  enhancedApi;
