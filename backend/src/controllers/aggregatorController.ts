// aggregatorController.ts
import { initServer } from '@ts-rest/express';
import { contract } from '@conformance-test-suite/shared/src/contractAggregator';
import { testController } from './testController';
import { generateOpenApi } from '@ts-rest/open-api';

const s = initServer();

export const controllerAggregator = s.router(contract, {
    ...testController
});

export const openApiDocument = generateOpenApi(contract, {
    info: {
      title: 'Posts API',
      version: '1.0.0',
    },
  });

export default controllerAggregator;