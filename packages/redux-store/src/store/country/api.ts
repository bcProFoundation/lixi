import { Country } from '@bcpros/lixi-models/lib/geo-location/country.model';
import { State } from '@bcpros/lixi-models/lib/geo-location/state.model';
import { axiosClient } from '../../utils/axiosClient';
import { City } from '@bcpros/lixi-models';

const countryApi = {
  getCountries(): Promise<Country> {
    const url = `/api/countries`;
    return axiosClient
      .get(url)
      .then(response => {
        return response.data as Country;
      })
      .catch(err => {
        const { response } = err;
        throw response?.data ?? err ?? 'Network Error';
      });
  },
  getStates(id: number | string): Promise<State> {
    const url = `/api/countries/${id}/states`;
    return axiosClient
      .get(url)
      .then(response => {
        return response.data as State;
      })
      .catch(err => {
        const { response } = err;
        throw response?.data ?? err ?? 'Network Error';
      });
  },
  getCities(stateId: number | string): Promise<City> {
    console.log('calling get cities!');
    const url = `/api/countries/${stateId}/cities`;
    return axiosClient
      .get(url)
      .then(response => {
        return response.data as City;
      })
      .catch(err => {
        const { response } = err;
        throw response?.data ?? err ?? 'Network Error';
      });
  }
};

export default countryApi;
