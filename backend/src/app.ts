import express from "express";
import { errorHandler } from "./middleware/errorHandler";
import cors from "cors";
import { Server } from "socket.io";
import swaggerUi from 'swagger-ui-express';
import { openApiDocument } from "./controllers/aggregatorController";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Error Handling
app.use(errorHandler);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

export default app;
