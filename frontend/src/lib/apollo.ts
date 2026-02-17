import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';

const httpLink = createHttpLink({
  uri: import.meta.env.VITE_API_URL || 'http://localhost:4053/graphql',
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('carbonx_token');
  return {
    headers: {
      ...headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  };
});

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message }) => {
      if (message.includes('Authentication required')) {
        localStorage.removeItem('carbonx_token');
        window.location.href = '/login';
      }
    });
  }
  if (networkError) {
    console.error('[Network error]', networkError);
  }
});

export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      CiiRecord: { keyFields: ['vesselId', 'year'] },
      EtsRecord: { keyFields: ['vesselId', 'year'] },
      FuelEuRecord: { keyFields: ['vesselId', 'year'] },
    },
  }),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network' },
  },
});
