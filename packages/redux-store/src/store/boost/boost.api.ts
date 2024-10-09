import { api } from './boost.generated';
import { api as offerApi } from '../escrow/offer/offer.api';
import { POST_TYPE } from '@bcpros/lixi-models/constants/post';

const enhancedApi = api.enhanceEndpoints({
  addTagTypes: ['Boost'],
  endpoints: {
    CreateBoost: {
      async onQueryStarted({ data }, { dispatch, getState, queryFulfilled }) {
        try {
          const { boostForId, boostedValue } = data;
          const offerTimelineInvalidatedBy = offerApi.util.selectInvalidatedBy(getState(), ['OfferTimeline']);
          for (const invalidatedBy of offerTimelineInvalidatedBy) {
            const { endpointName, originalArgs } = invalidatedBy;
            dispatch(
              offerApi.util.updateQueryData(endpointName as any, originalArgs, draft => {
                const fields = Object.keys(draft);
                for (const field of fields) {
                  if (!draft[field]) continue;
                  const timelineItemToUpdateIndex = draft[field].edges.findIndex(
                    item => item.node.id === `${POST_TYPE.OFFER}:${boostForId}`
                  );
                  const timelineItemToUpdate = draft[field].edges[timelineItemToUpdateIndex];
                  if (timelineItemToUpdate) {
                    draft[field].edges[timelineItemToUpdateIndex].node.data.boostScore.boostScore =
                      boostedValue + draft[field].edges[timelineItemToUpdateIndex].node.data.boostScore.boostScore;
                  }
                }
              })
            );
          }
        } catch {}
      }
    }
  }
});

export { enhancedApi as api };

export const { useCreateBoostMutation } = enhancedApi;
