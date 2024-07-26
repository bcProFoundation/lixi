import { graphqlRequestBaseQuery } from '@rtk-query/graphql-request-base-query';
import { GraphQLClient } from 'graphql-request';
import intl from 'react-intl-universal';
import { createApi } from '@reduxjs/toolkit/query/react';
import Cookies from 'universal-cookie';

export const client = new GraphQLClient(
  process.env.NEXT_PUBLIC_APPLICATION_URL ? `${process.env.NEXT_PUBLIC_LIXI_API}/graphql` : '/graphql',
  {
    credentials: 'include',
    cache: 'no-cache',
    headers: () => {
      const cookies = new Cookies(null, { path: '/' });
      const locale = cookies.get('locale');
      const lang = locale ? locale.split('-')[0] : 'en';
      return {
        lang: lang
      };
    }
  }
);

export const api = createApi({
  baseQuery: graphqlRequestBaseQuery({
    client,
    customErrors: ({ name, stack, response }) => {
      let errorMessage = intl.get('page.unableCreatePageServer');
      if (response?.errors) {
        errorMessage = response?.errors[0]?.message ?? errorMessage;
      }
      return {
        name,
        message: errorMessage,
        stack
      };
    }
  }),
  endpoints: () => ({})
});
