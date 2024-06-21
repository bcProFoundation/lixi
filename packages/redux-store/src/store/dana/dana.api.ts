import { api } from './dana.generated';

const enhancedApi = api.enhanceEndpoints({
  addTagTypes: ['Dana'],
  endpoints: {
    ConvertDanaToCoin: {}
  }
});

export { enhancedApi as api };

export const { useConvertDanaToCoinQuery } = enhancedApi;
