import { api } from './fiat-currency.generated';

const enhancedApi = api.enhanceEndpoints({
  addTagTypes: [],
  endpoints: {
    GetFiatRate: {}
  }
});

export { enhancedApi as api };

export const { useGetFiatRateQuery, useLazyGetFiatRateQuery } = enhancedApi;
