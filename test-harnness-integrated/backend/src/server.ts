import { createServer } from "http";
import app from "./app";
import { io } from "./websocket";
import { createExpressEndpoints } from '@ts-rest/express';
import { contract } from '@conformance-test-suite/shared/src/contractAggregator';
import { controllerAggregator } from './controllers/aggregatorController';
import { config } from './config/env';

const httpServer = createServer(app);

io.attach(httpServer);

// Start the server
httpServer.listen(config.PORT, () => {
  console.log(`Server is running on port ${config.PORT}`);
});

createExpressEndpoints(contract, controllerAggregator, app);