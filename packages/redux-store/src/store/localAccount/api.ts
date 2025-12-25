import { axiosLocalClient } from '../../utils/axiosClient';
import { LocalUser } from '../../models/localUser';

const localAccountApi = {
  localLogin(localUser: LocalUser): Promise<any> {
    const url = '/local-login'; // Route group (internal) creates /local-login path
    return axiosLocalClient
      .post(url, localUser)
      .then(res => {
        return res.data;
      })
      .catch(err => {
        const { response } = err;
        throw response?.data ?? err ?? 'Network Error';
      });
  }
};

export default localAccountApi;
