"use client"; // Ensure this file is client-only

import { initTsrReactQuery } from '@ts-rest/react-query/v5';
import { contract } from '@conformance-test-suite/shared/src/contractAggregator';
import { getBackendAddress } from './backend';

export const tsr = initTsrReactQuery(contract, {
  baseUrl: getBackendAddress(),
  baseHeaders: {
    'x-app-source': 'ts-rest',
  },
});