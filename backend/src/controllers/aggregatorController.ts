// aggregatorController.ts
import { initServer } from '@ts-rest/express';
import { contract } from '@conformance-test-suite/shared/src/contractAggregator';
import { testController } from './testController';

const s = initServer();

export const controllerAggregator = s.router(contract, {
    ...testController
});

export default controllerAggregator;