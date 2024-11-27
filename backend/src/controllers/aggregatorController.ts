// aggregatorController.ts
import { initServer } from '@ts-rest/express';
import { contract } from '@conformance-test-suite/shared/src/contractAggregator';
import { systemController } from './systemController';
import { profileConfigurationController } from './profileConfigurationController';
import { generateOpenApi } from '@ts-rest/open-api';
import { testRunController } from './testRunController';

const s = initServer();

export const controllerAggregator = s.router(contract, {
    ...systemController,
    ...profileConfigurationController,
    ...testRunController
});

export const openApiDocument = generateOpenApi(contract, {
    info: {
        title: 'Conformance Test Suite API',
        version: '1.0.0',
    },
});

export default controllerAggregator;