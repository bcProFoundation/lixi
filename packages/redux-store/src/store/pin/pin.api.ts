import { EntityState } from '@reduxjs/toolkit';
import { PageInfo } from '@generated/types.generated';
import { api, PinQuery } from './pin.generated';

export interface PinApiState extends EntityState<PinQuery['pin']> {
  pageInfo: PageInfo;
  totalCount: number;
}

const enhancedApi = api.enhanceEndpoints({
  addTagTypes: ['Pin'],
  endpoints: {
    Pin: {
      providesTags: (result, error, arg) => ['Pin']
    }
  }
});

export { enhancedApi as api };

export const { usePinQuery, useCreatePostPinMutation, useLazyPinQuery, useRemovePostPinMutation } = enhancedApi;
