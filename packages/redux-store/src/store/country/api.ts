import { Country } from '@bcpros/lixi-models/lib/geo-location/country.model';
import { State } from '@bcpros/lixi-models/lib/geo-location/state.model';
import { axiosClient } from '../../utils/axiosClient';
import { Location } from '@bcpros/lixi-models/lib/geo-location/location.model';

export const countryApi = {
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
  getStates(countryCode: string): Promise<Location> {
    const url = `/api/countries/${countryCode}/states`;
    return axiosClient
      .get(url)
      .then(response => {
        return response.data as Location;
      })
      .catch(err => {
        const { response } = err;
        throw response?.data ?? err ?? 'Network Error';
      });
  },
  getCities(countryCode: string, adminCode: string): Promise<Location> {
    const url = `/api/countries/cities?countryCode=${countryCode}&adminCode=${adminCode}`;
    return axiosClient
      .get(url)
      .then(response => {
        return response.data as Location;
      })
      .catch(err => {
        const { response } = err;
        throw response?.data ?? err ?? 'Network Error';
      });
  },
  getLocations(query: string): Promise<Location> {
    const url = `/api/countries/locations?query=${query}`;
    return axiosClient
      .get(url)
      .then(response => {
        return response.data as Location;
      })
      .catch(err => {
        const { response } = err;
        throw response?.data ?? err ?? 'Network Error';
      });
  },
  getCoordinate(lat: string, lng: string): Promise<Location> {
    const url = `/api/countries/coordinate?lat=${lat}&lng=${lng}`;
    return axiosClient
      .get(url)
      .then(response => {
        return response.data as Location;
      })
      .catch(err => {
        const { response } = err;
        throw response?.data ?? err ?? 'Network Error';
      });
  }
};
