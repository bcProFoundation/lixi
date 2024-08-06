import { axiosLocalClient } from '../../utils/axiosClient';
import { LocalUser } from '../../models/localUser';

const localAccountApi = {
  localLogin(localUser: LocalUser): Promise<any> {
    const url = process.env.NEXT_PUBLIC_APPLICATION_URL ? '/api/local-login' : '/_api/local-login'; // replace this to /api/local-login when upgrage lixi to nextjs 14
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
