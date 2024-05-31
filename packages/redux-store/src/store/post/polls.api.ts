import { PageInfo, Post } from '@generated/types.generated';
import { EntityState } from '@reduxjs/toolkit';
import { POST_TYPE } from '@bcpros/lixi-models';
import { api as timelineApi } from '@store/timeline/timeline.api';
import { api as pollApi } from './poll.generated';
import { api as postApi } from './posts.api';

export interface PostApiState extends EntityState<Post, string> {
  pageInfo: PageInfo;
  totalCount: number;
}

const enhancedApi = pollApi.enhanceEndpoints({
  addTagTypes: ['Post', 'Posts', 'Timeline', 'CommentCreated'],
  endpoints: {
    createPoll: {
      async onQueryStarted({ input }, { dispatch, getState, queryFulfilled }) {
        try {
          const { data: result } = await queryFulfilled;

          const timelineInvalidatedBy = timelineApi.util.selectInvalidatedBy(getState(), ['Timeline']);
          for (const invalidatedBy of timelineInvalidatedBy) {
            const { endpointName, originalArgs } = invalidatedBy;

            dispatch(
              timelineApi.util.updateQueryData(endpointName as any, originalArgs, draft => {
                const fields = Object.keys(draft);
                for (const field of fields) {
                  if (!draft[field]) continue;

                  const timelineId = `${POST_TYPE.POLL}:${result.createPoll.id}`;
                  draft[field].edges.unshift({
                    cursor: timelineId,
                    node: {
                      id: timelineId,
                      data: {
                        __typename: 'Poll',
                        ...result.createPoll
                      }
                    }
                  });
                  draft[field].totalCount = draft[field].totalCount + 1;
                }
              })
            );
          }

          const postsInvalidatedBy = postApi.util.selectInvalidatedBy(getState(), ['Posts']);
          for (const invalidatedBy of postsInvalidatedBy) {
            const { endpointName, originalArgs } = invalidatedBy;
            dispatch(
              postApi.util.updateQueryData(endpointName as any, originalArgs, draft => {
                const fields = Object.keys(draft);
                for (const field of fields) {
                  if (!draft[field]) continue;

                  draft[field].edges.unshift({
                    cursor: result.createPoll.id,
                    node: {
                      ...result.createPoll
                    }
                  });
                  draft[field].totalCount = draft[field].totalCount + 1;
                }
              })
            );
          }
        } catch { }
      }
    },
    createVote: {
      async onQueryStarted({ input }, { dispatch, getState, queryFulfilled }) {
        const { pollId, optionId, previousOptionIds } = input;
        try {
          const { data: result } = await queryFulfilled;
          const { createVote } = result;

          const timelineInvalidatedBy = timelineApi.util.selectInvalidatedBy(getState(), ['Timeline']);
          for (const invalidatedBy of timelineInvalidatedBy) {
            const { endpointName, originalArgs } = invalidatedBy;
            dispatch(
              timelineApi.util.updateQueryData(endpointName as any, originalArgs, draft => {
                const fields = Object.keys(draft);
                for (const field of fields) {
                  if (!draft[field]) continue;

                  const timelineId = `${POST_TYPE.POLL}:${pollId}`;
                  const indexToUpdate = draft[field].edges.findIndex(item => item.cursor === timelineId);
                  if (indexToUpdate != -1) {
                    //change default option of poll
                    draft[field].edges[indexToUpdate].node.data.poll.defaultOptions = [optionId];

                    //plus % to new option
                    const indexToPlusOption = draft[field].edges[indexToUpdate].node.data.poll.options.findIndex(
                      item => item.id === optionId
                    );
                    if (indexToPlusOption != -1)
                      draft[field].edges[indexToUpdate].node.data.poll.options[indexToPlusOption].danaScoreOption +=
                        createVote.pollDanaScore;

                    //minus % to old option
                    const indexToMinusOption = draft[field].edges[indexToUpdate].node.data.poll.options.findIndex(
                      item => item.id === previousOptionIds[0]
                    );
                    if (indexToMinusOption != -1)
                      draft[field].edges[indexToUpdate].node.data.poll.options[indexToMinusOption].danaScoreOption -=
                        createVote.pollDanaScore;
                  }
                }
              })
            );
          }

          const postsInvalidatedBy = postApi.util.selectInvalidatedBy(getState(), ['Posts']);
          for (const invalidatedBy of postsInvalidatedBy) {
            const { endpointName, originalArgs } = invalidatedBy;
            dispatch(
              postApi.util.updateQueryData(endpointName as any, originalArgs, draft => {
                const fields = Object.keys(draft);
                for (const field of fields) {
                  if (!draft[field]) continue;

                  const indexToUpdate = draft[field].edges.findIndex(item => item.cursor === pollId);
                  if (indexToUpdate != -1) {
                    //change default option of poll
                    draft[field].edges[indexToUpdate].node.poll.defaultOptions = [optionId];

                    //plus % to new option
                    const indexToPlusOption = draft[field].edges[indexToUpdate].node.poll.options.findIndex(
                      item => item.id === optionId
                    );
                    if (indexToPlusOption != -1)
                      draft[field].edges[indexToUpdate].node.poll.options[indexToPlusOption].danaScoreOption +=
                        createVote.pollDanaScore;

                    //minus % to old option
                    const indexToMinusOption = draft[field].edges[indexToUpdate].node.poll.options.findIndex(
                      item => item.id === previousOptionIds[0]
                    );
                    if (indexToMinusOption != -1)
                      draft[field].edges[indexToUpdate].node.poll.options[indexToMinusOption].danaScoreOption -=
                        createVote.pollDanaScore;
                  }
                }
              })
            );
          }

          //update single post
          const postInvalidatedBy = postApi.util.selectInvalidatedBy(getState(), ['Post']);
          for (const invalidatedBy of postInvalidatedBy) {
            const { endpointName, originalArgs } = invalidatedBy;
            dispatch(
              postApi.util.updateQueryData('Post', originalArgs, draft => {
                //change default option of poll
                draft.post.poll.defaultOptions = [optionId];

                //plus % to new option
                const indexToPlusOption = draft.post.poll.options.findIndex(item => item.id === optionId);
                if (indexToPlusOption != -1)
                  draft.post.poll.options[indexToPlusOption].danaScoreOption += createVote.pollDanaScore;

                //minus % to old option
                const indexToMinusOption = draft.post.poll.options.findIndex(item => item.id === previousOptionIds[0]);
                if (indexToMinusOption != -1)
                  draft.post.poll.options[indexToMinusOption].danaScoreOption -= createVote.pollDanaScore;
              })
            );
          }
        } catch { }
      }
    }
  }
});

export { enhancedApi as api };

export const { useCreatePollMutation, useCreateVoteMutation } = enhancedApi;
