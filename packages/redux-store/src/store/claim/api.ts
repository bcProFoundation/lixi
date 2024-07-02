import { IPaginationResult } from '@bcpros/lixi-models/utils/paginationResult';
import { Claim, ClaimDto, CreateClaimDto, ViewClaimDto } from '@bcpros/lixi-models/lib/claim';
import axiosClient from '../../utils/axiosClient';

const claimApi = {
  getById(id: number): Promise<ViewClaimDto> {
    const url = `/api/claims/${id}`;
    return axiosClient
      .get(url)
      .then(response => {
        return response.data as ViewClaimDto;
      })
      .catch(err => {
        const { response } = err;
        throw response?.data ?? err ?? 'Network Error';
      });
  },
  post(dto: CreateClaimDto) {
    const url = '/api/claims';
    return axiosClient
      .post(url, dto)
      .then(response => {
        return response.data as ClaimDto;
      })
      .catch(err => {
        const { response } = err;
        throw response.data;
      });
  },
  getByLixiId(id: number, startId?: number): Promise<IPaginationResult<Claim>> {
    const url = startId ? `/api/lixies/${id}/claims?startId=${startId}` : `/api/lixies/${id}/claims`;

    return axiosClient
      .get(url)
      .then(response => {
        return response.data as IPaginationResult<Claim>;
      })
      .catch(err => {
        const { response } = err;
        throw response.data;
      });
  }
};

export default claimApi;
