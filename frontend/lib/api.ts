import { initQueryClient } from '@ts-rest/react-query';
import { contract } from '@conformance-test-suite/shared/src/contractAggregator';
import { getBackendAddress } from './backend';

export const client = initQueryClient(contract, {
  baseUrl: getBackendAddress(),
  baseHeaders: {
    'Content-Type': 'application/json',
  },
});