import { CreatePageCommand, EditPageCommand } from '@bcpros/lixi-models/lib/page/create-page.command';
import { PageDto } from '@bcpros/lixi-models/lib/page/page.dto';
import axiosClient from '../../utils/axiosClient';

const pageApi = {
  post(data: CreatePageCommand): Promise<PageDto> {
    const url = '/api/pages';
    return axiosClient
      .post(url, data, { withCredentials: true })
      .then(response => {
        return response.data as PageDto;
      })
      .catch(err => {
        const { response } = err;
        throw response?.data ?? err ?? 'Network Error';
      });
  },
  getSubPage(accountId: number): Promise<any> {
    const url = `/api/pages/${accountId}/subPage`;
    return axiosClient
      .get(url)
      .then(response => {
        return response.data.data as any;
      })
      .catch(err => {
        const { response } = err;
        throw response?.data ?? err ?? 'Network Error';
      });
  },
  getAllPages(): Promise<any> {
    const url = `/api/pages`;
    return axiosClient
      .get(url)
      .then(response => {
        return response.data as any;
      })
      .catch(err => {
        const { response } = err;
        throw response?.data ?? err ?? 'Network Error';
      });
  },
  getDetailPage(id: string): Promise<any> {
    const url = `/api/pages/${id}`;
    return axiosClient
      .get(url)
      .then(response => {
        return response.data as any;
      })
      .catch(err => {
        const { response } = err;
        throw response?.data ?? err ?? 'Network Error';
      });
  },
  update(id: string, data: EditPageCommand): Promise<PageDto> {
    const url = `/api/pages/${id}`;
    return axiosClient
      .patch(url, data, { withCredentials: true })
      .then(response => {
        return response.data as PageDto;
      })
      .catch(err => {
        const { response } = err;
        throw response?.data ?? err ?? 'Network Error';
      });
  }
};

export default pageApi;
