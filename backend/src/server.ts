import { createServer } from "http";
import app from "./app";
import { io } from "./websocket";
import { createExpressEndpoints } from '@ts-rest/express';
import { contract } from '@conformance-test-suite/shared/src/contractAggregator';
import { controllerAggregator } from './controllers/aggregatorController';

const httpServer = createServer(app);

io.attach(httpServer);

// Start the server
const PORT = 5000;
httpServer.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

createExpressEndpoints(contract, controllerAggregator, app);