import { api } from './accounts.generated';

const enhancedApi = api.enhanceEndpoints({
  addTagTypes: ['Account', 'Accounts'],
  endpoints: {
    getAccountByAddress: {
      providesTags: (result, error, arg) => ['Account']
    },
    updateAccount: {
      invalidatesTags: ['Account']
    }
  }
});

export { enhancedApi as api };

export const {
  useGetAccountByAddressQuery,
  useLazyGetAccountByAddressQuery,
  useUpdateAccountMutation,
  useAllFollowersByPageQuery,
  useLazyAllFollowersByPageQuery,
  useAccountsQuery,
  useLazyAccountsQuery,
  useTopWeekAccountsQuery,
  useLazyTopWeekAccountsQuery,
  useTopMonthAccountsQuery,
  useLazyTopMonthAccountsQuery
} = enhancedApi;
