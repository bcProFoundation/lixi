import { axiosClient } from '../../utils/axiosClient';
import { Setting } from '@bcpros/lixi-models/lib/setting/setting.model';
import { UpdateSettingCommand } from '@bcpros/lixi-models/lib/setting/setting.dto';

export const settingApi = {
  getSetting(id: number | string): Promise<Setting> {
    const url = `/api/v1/settings/${id}`;
    return axiosClient
      .get(url)
      .then(response => {
        return response.data as Setting;
      })
      .catch(err => {
        const { response } = err;
        throw response?.data ?? err ?? 'Network Error';
      });
  },

  getAllSetting(): Promise<{ id: Setting }> {
    const url = `/api/v1/settings`;
    return axiosClient
      .get(url)
      .then(response => {
        return response.data;
      })
      .catch(err => {
        const { response } = err;
        throw response?.data ?? err ?? 'Network Error';
      });
  },

  updateSetting(updateSettingCommand: UpdateSettingCommand): Promise<Setting> {
    const url = `/api/v1/settings/${updateSettingCommand.accountId}/update`;
    return axiosClient
      .post(url, updateSettingCommand)
      .then(response => {
        return response.data as Setting;
      })
      .catch(err => {
        const { response } = err;
        throw response?.data ?? err ?? 'Network Error';
      });
  }
};
