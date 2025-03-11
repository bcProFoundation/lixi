import { api } from './accounts.generated';

const enhancedApi = api.enhanceEndpoints({
  addTagTypes: ['Account', 'Accounts'],
  endpoints: {
    getAccountByAddress: {
      providesTags: (result, error, arg) => ['Account']
    },
    GetLocaleCashAvatar: {},
    updateAccount: {
      invalidatesTags: ['Account']
    },
    UpdateAccountTelegramUsername: {
      onQueryStarted: async ({ telegramId, telegramUsername }, { dispatch, queryFulfilled }) => {
        try {
          const { data } = await queryFulfilled;
          if (data) {
            const { updateAccountTelegramUsername } = data;
            const { address } = updateAccountTelegramUsername;
            dispatch(
              api.util.updateQueryData('getAccountByAddress', { address }, draft => {
                if (draft) {
                  draft.getAccountByAddress.telegramUsername = telegramUsername;
                }
              })
            );
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
  }
});

export { enhancedApi as api };

export const {
  useGetAccountByAddressQuery,
  useLazyGetAccountByAddressQuery,
  useGetLocaleCashAvatarQuery,
  useLazyGetLocaleCashAvatarQuery,
  useUpdateAccountMutation,
  useAllFollowersByPageQuery,
  useLazyAllFollowersByPageQuery,
  useAccountsQuery,
  useLazyAccountsQuery,
  useTopWeekAccountsQuery,
  useLazyTopWeekAccountsQuery,
  useTopMonthAccountsQuery,
  useLazyTopMonthAccountsQuery,
  useUpdateAccountTelegramUsernameMutation
} = enhancedApi;
